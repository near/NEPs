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
