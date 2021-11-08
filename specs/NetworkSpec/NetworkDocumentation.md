# 8 Routing table computation

Routing table computation does a few things:
- for each peer `B`, calculates set of peers `|C_b|`, such that each peer is on the shortest path to `B`.
- removing unreachable edges from memory and storing them to disk

## 8.1 Step 1
`PeerManagerActor` runs a `update_routing_table_trigger` every `UPDATE_ROUTING_TABLE_INTERVAL` seconds.

`RoutingTableMessages::RoutingTableUpdate` message is sent to `RoutingTableActor` to request routing table re-computation.

```rust
RoutingTableMessages::RoutingTableUpdate {
    /// An enum, used for testing, by default pruning is done once an hour.
    prune: Prune,
    /// A duration on when to prune edges, by default we will remove peers not reachable for an hour.
    prune_edges_not_reachable_for: Duration,
},
```

## 8.2 Step 2
`RoutingTableActor` receives the message, and then
- calls `recalculate_routing_table` method, which computes `RoutingTableActor::peer_forwarding: HashMap<PeerId, Vec<PeerId>>`.
For each `PeerId` on the network, gives list of connected peers, which are on the shortest path to the destination.
It marks reachable peers in `peer_last_time_reachable` struct.
- calls `prune_edges` which removes from memory all edges, that were not reachable for at least 1 hour, based on `peer_last_time_reachable` data structure.
Those edges are then stored to disk.

## 8.3 Step 3
`RoutingTableActor` sends `RoutingTableUpdateResponse` message back to `PeerManagerActor`.

`PeerManagerActor` keep local copy of `edges_info`, called `local_edges_info` containing only edges adjacent to current node.

- This message contains list of local edges, which `PeerManagerActor` should remove.
- `peer_forwarding` which represent on how to route messages in the P2P network
- `peers_to_ban` - list of peers to ban for sending us edges, which failed validation in `EdgeVerifierActor`.

```rust
    RoutingTableUpdateResponse {
        /// PeerManager maintains list of local edges. We will notify `PeerManager`
        /// to remove those edges.
        local_edges_to_remove: Vec<Edge>,
        /// Active PeerId that are part of the shortest path to each PeerId.
        peer_forwarding: Arc<HashMap<PeerId, Vec<PeerId>>>,
        /// List of peers to ban for sending invalid edges.
        peers_to_ban: Vec<PeerId>,
    },
```

## 8.4 Step 4
`PeerManagerActor` received `RoutingTableUpdateResponse` and then:
- updates local copy of`peer_forwarding`, used for routing messages.
- removes `local_edges_to_remove` from `local_edges_info`.
- bans peers, who sent us invalid edges.