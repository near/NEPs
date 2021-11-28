# 12  routing_table_view: RoutingTableView,

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

# 13. PeerManagerActor messages (different file)
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

# 13.1. NetworkRequest - types of messages send  (different file)    
TODO

# 14. PeerActor messages  (different file)

- Write handler + stream handler - TODO
- SendMessage - TODO
- QueryPeerStats - TODO
- PeerManagerRequest (Ban Peer, Unregister Peer) - TODO

# 16. RoutingTableActor (different file)
TODO

# 17. EdgeVerifierActor (different file)
TODO

# 19. ThrottleRateLimiter (different file)
NOT IMPLEMENTED YET - TODO once we add it

# 13. PeerManagerActor Triggers (different file)
