# 11. Code flow - routing a message
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
