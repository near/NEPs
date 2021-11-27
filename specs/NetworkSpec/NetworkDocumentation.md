### 9. Edge pruning, storage and shortest paths
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
