# 7. Adding new edges to routing tables 

This section covers the process of adding new edges, received from another nodes, 
to the routing table. It consists of several steps covered below.

## 7.1 Step 1
`PeerManagerActor` receives `RoutingTableSync` message containing list of new `edges` to add.
This message is them forwarded to `RoutingTableActor`.      
Field `accounts` will be covered in a different section.

```rust
pub struct RoutingTableSync {
    /// List of known edges from `RoutingTableActor::edges_info`.
    edges: Vec<Edge>,
    /// List of known `account_id` to `PeerId` mappings.
    /// Useful for `send_message_to_account` method, to route message to particular account.
    accounts: Vec<AnnounceAccount>,
}
```   

## 7.2 Step 2
`PeerManagerActor` forwards those edges to `RoutingTableActor` inside
```rust
pub struct ValidateEdgeList {
    /// List of Edges, which will be sent to `EdgeVerifierActor`.
    pub(crate) edges: Vec<Edge>,
    /// A set of edges, which have been verified. This is used to avoid doing duplicated work by
    /// `EdgeVerifierActor`, and is a source of memory leak.
    /// TODO(#5254): Simplify this process.
    pub(crate) edges_info_shared: Arc<Mutex<HashMap<(PeerId, PeerId), u64>>>,
    /// A concurrent queue. After edge become validated. They will be sent from `EdgeVerifierActor` back to
    /// `PeerManagetActor`, and then send to `RoutingTableActor`. And then `RoutingTableActor`
    /// will add them.
    /// TODO(#5254): Simplify this process.
    pub(crate) sender: QueueSender<Edge>,
    #[cfg(feature = "test_features")]
    /// Feature to disable edge validation for purpose of testing.
    pub(crate) adv_disable_edge_signature_verification: bool,
    /// Peer that may be banned if any of the edges are found to be invalid.
    pub(crate) source_peer_id: PeerId,
}
```     

## 7.3 Step 3
`RoutingTableActor` get the `ValidateEdgeList` message.
Filters out `edges` that have already been verified, those that are already in `RoutingTableActor::edges_info`.

Then, it updates `edge_verifier_requests_in_progress` to mark that edge verifications are in progress, and edges shouldn't
be pruned from Routing Table (see section TODO).

Then, after removing already validated edges, the modified message is forwarded to `EdgeValidatorActor`.

## 7.4 Step 4
`EdgeValidatorActor` goes through list of all edges.
It checks whenever all edges are valid (their cryptographic signatures match, etc.).

If any edge is not valid peer will be banned.

Edges that are validated are written to concurrent queue `ValidateEdgeList::sender`/

## 7.5 Step 5
`broadcast_validated_edges_trigger` runs, and gets validated edges from `EdgeVerifierActor` see 
`self.routing_table_exchange_helper.edges_to_add_receiver.pop()`.

Every new edge will be broadcast to all connected peers. 

And then, all validated edges received from `EdgeVerifierActor` will be sent again to `RoutingTableActor` inside 

```RoutingTableMessages::AddVerifiedEdges {
    edges: Vec<Edge>,
},
```    

## 7.5 Step 6
When `RoutingTableActor` receives `RoutingTableMessages::AddVerifiedEdges`, the method`add_verified_edges_to_routing_table` will be called.
It will add edges to `RoutingTableActor::edges_info` struct, and mark routing table, that it needs recalculation
see `RoutingTableActor::needs_routing_table_recalculation`.

## 8 Routing table computation / Edge pruning, storage and shortest paths


TODO REWRITE
`PeerManagerActor` -> `RoutingTableActor` -> `EdgeValidatorActor` ...

### 8. Edge pruning, storage and shortest paths
TODO REWRITE

Each node is also keeping the next edge-hop on the shortest path to each other node. This is the edge that will be used when it needs to transfer some data to the destination node.

Nodes are also ‘refreshing’ the list of edges from time to time, and if they notice that a given edge hasn’t been updated for a while, they trigger the cleanup.

During cleanup, we remove the selected edges from the graph and we write them down to disk (into ColComponent column). This is done to persist the information about the last nonce that we’ve seen.

When we receive a new peer_id(node_id) that we don’t have in memory - we’d check the storage to see if we had any edges from it in the past - and load them from storage if needed.

This way, we prevent the attack, where someone would be resending us the edges that existed in the past, but were deleted since then.



# 9. Code flow - routing a message
TODO REWRITE


This is the example of the message that is being sent between nodes (RawRoutedMessage) (https://github.com/near/nearcore/blob/fa8749dc60fe0de8e94c3046571731c622326e9f/chain/network-primitives/src/types.rs#L362)

Each of these methods have a ‘target’ - that is either the account_id or peer_id or hash (which seems to be used only for route back..). If target is the account - it will be converted using ‘routing_table.account_owner’ to the peer.

Upon receiving the message, the peer_manager will sign it (https://github.com/near/nearcore/blob/master/chain/network/src/peer_manager.rs#L1285)
And convert into RoutedMessage (which also have things like TTL etc)

Then it will use the routing_table, to find the route to the target peer (add route_back if needed) and then send the message over the network as PeerMessage::Routed.

When Peer receives this message (as PeerMessage::Routed), it will pass it to PeerManager (as RoutedMessageFrom), which would then check if the message is for the current Peer (if yes, it would pass it for the client) and if not - it would pass it along the network.

All these messages are handled by receive_client_message in Peer. (NetworkClientMessags) - and transferred to ClientActor in (chain/client/src/client_actor.rs)


NetworkRequests to PeerManager actor are triggering the RawRoutedMessage

Lib_rs (ShardsManager) has a network_adapter - coming from client’s network_adapter that comes from ClientActor that comes from start_client call that comes from start_with_config
(that crates PeerManagerActor - that is passed as target to network_recipent).


# 10. Message serialization - how messages are exchanged on TCP level
We use Tokio (https://github.com/tokio-rs/tokio) to handle the TCP connections steam, and on top of that the custom serialized Borsh (https://github.com/near/borsh-rs) to send messages between the nodes.








--------------------------------------------------------------------- FUTURE SECTIONS #########

               
# 7. - New routing table exchange algorithm - nightly protocol

This new algorithm is described in [RoutingTableExchangeAlgorithm.md]

# 7. Code flow - exchanging routing tables
Once a successful connection is established, the node will exchange the network layout information with other nodes (get the list of edges, list of validators etc) and will be ready to start forwarding the messages.

From time to time, node will try to ‘prune’ its network - by removing the edges/nodes, that were not reachable for more than 1 hour.

### 7.1. Routing table exchange - Old method
TODO

### 7.2. Routing table exchange - New method (nightly)
Exchanging network graph & Inverted Bloom Filters

As a part of their job, the nodes are also keeping the whole layout of the network (that is - all the edges between all the nodes). As this data can change dynamically, they often compare and ‘sync’ their graphs with their neighbours.

In the past, they used to send the whole graph to each other, but as the size of the network grows, this becomes more and more expensive.
The solution that was implemented recently is based on inverted bloom filters - that allows us to easily find which edges are missing from the neighbour and send over only those.




# 10. Code flow - broadcasting a message
TODO


# 12. Database
### 12.1 Storage of deleted edges
Everytime a group of peers becomes unreachable at the same time; We store edges belonging to
them in components. We remove all of those edges from memory, and save them do database,
If any of them were to be reachable again, we would re-add them.

To store components, we have the following column in the DB.
ColLastComponentNonce -> stores component_nonce: u64, which is the lowest nonce that
                         hasn't been used yet. If new component gets created it will use
                         this nonce.
ColComponentEdges     -> Mapping from `component_nonce` to list of edges
ColPeerComponent      -> Mapping from `peer_id` to last component nonce if there
                         exists one it belongs to.
### 12.2 Storage of `account_id` to `peer_id` mapping
+ColAccountAnouncements -> Stores a mapping from `account_id` to tuple (`account_id`, `peer_id`, `epoch_id`, `signature`).

# 13. PeerManagerActor messages
- NetworkRequest - TODO
- InboundTcpConnect - TODO
- GetRoutingOption - TODO
- OutBoundTcpConnect - TODO
- Consolidate - TODO
- Unregister - TODO
- Ban - TODO
- PeersRequest - TODO
- PeersResponse - TODO
- RoutedMessageFrom - TODO
- RawRoutedMessage - TODO
- PeerRequest - TODO

# 13.1. NetworkRequest - types of messages send
TODO

# 13.2. `Consolidate` logic + communication with `PeerActor`

# 14. PeerActor messages

- Write handler + stream handler - TODO
- SendMessage - TODO
- QueryPeerStats - TODO
- PeerManagerRequest (Ban Peer, Unregister Peer) - TODO

# 16. RoutingTableActor
TODO

# 17. EdgeVerifierActor
TODO

# 19. ThrottleRateLimiter
NOT IMPLEMENTED YET - TODO once we add it

# 20. Metrics
