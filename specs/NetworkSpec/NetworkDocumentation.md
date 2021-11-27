# 9. Message transportation layers.

## 9.1 Messages send between Actors

## 9.2 Messages send between Actors wrapper

## 9.3 Message encoding on TCP level
Message serialization - how messages are exchanged.

We use Tokio (https://github.com/tokio-rs/tokio) to handle the TCP connections steam, and on top of that the custom serialized Borsh (https://github.com/near/borsh-rs) to send messages between the nodes.

## 9.4 Messages queries by JsonRpcServer

# 10. Prometheus metrics      network_metrics: NetworkMetrics,

# 11. peer_store: PeerStore,

# 12  routing_table_view: RoutingTableView,

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

# 13. PeerManagerActor Triggers
