- Proposal Name: Network specification
- Start Date: 2019-08-26
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)

# Summary
[summary]: #summary

Specification of the networking layer that peers use to communicate.
Includes implementation details of peer discovery, handshake and reputation.
Does not include the format of the actual blockchain protocol.

# Motivation
[motivation]: #motivation

To provide actually secure routing, especially among the validators, we postulate that account information and cryptographic signatures backed by stake are required.
This network specification describes all of the protocols to connect, handshake, discover peers and maintain connections and an integration with the blockchain itself.

This document should serve as reference for all the clients to implement networking layer.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

## System description

Our system is design on the random sampling of peers and cryptohraphic routing.
Each node has ID that is ED25519 public key derived from secret key known only to this node.
Additionally, active participants, such as block producers and other nodes that want to link their account information to the peer information have a string `account_id` and appropriate `public_key` which is associated with this account. Accounts maintained by blockchain itself, and can not be forged without breaking the blockchain itself.

### Storing network information

A client stores information about other nodes in three data structures. `known_peers` a long-term database, which is stored on disk and persists between reboots. And two short-term databases `active_peers` and `routing` that start empty.

`known_peers`. The `known_peers` is stored on disk and contains information about each node that client has ever connected or recevied gossip about. There is no limit to the size of the `known_peers`.
Each entry of `known_peers` is tuple of `<node ID, IP address, TCP port, last_seen, status>`. Where `last_seen` is a timestamp when we received last message from this peer. If this was received from gossip, `last_seen` is 0. Status contains if this peer is currently unknown, connected, disconnected or banned.

`active_peers`. The `active_peers` maintains relevant information about currently connected peers. Such as their `<node ID, IP address, TCP port, last_seen, socket>`.

`routing_table`. The `routing_table` contains for `account_id` a list of routes that are rooted in this node's peers.

### Bootstrapping

When node starts it have two lists:
 - Bootstrap nodes, nodes that are well known in the eco-system as nodes that provide information about the network.
  - Known peers, peers that this node has connected before in previous sessions and stored on disk to persist between runs. This list can be empty if this is first time to start the node.

Both of these lists are merged and node starts by connecting to `max_peers` random peers from this list.
If there is not enough peers in the lists, node periodically tries to connect to newly discovered peers with a exponential back off timeout (in case network is smaller than K in the first place) until it switches to *regular* mode. *Regular* mode means that node periodically checks if there is not enough peers (due to disconnects) and conncects to new peers.

Additionally, to prevent various eclipse attacks where attacker forces node to have all incoming connection to them, we require node to have at least `min_outgoing_peers` outgoing connections.

In pseudo code, this would look like:
```
  peers = bootstrap & known_peers - banned_peers
  while true
    if len(incoming_peers) + len(outgoing_peers) > max_peers && len(outgoing_peers) > min_outgoing_peers:
        continue
    peers_to_connect = max(max_peers - len(outgoing_peers) - len(incoming_peers), min_outgoing_peers - len(outgoing_peers))
    sample_peers = sample(peers, peers_to_connect)
    for peer in sample_peers:
        connect(peer)
    wait_time = max(wait_time * backoff, peer_reconnect_wait)
    sleep(wait_time)
```

### Handshake

When one peer creates outgoing connection to another peer, they send a `Handshake` message.
This message informs the other peer about their ID, protocol version and provides some blockchain information to check that these two peers are on same one (e.g. `genesis hash`).
After handshake sent, peer wait `handshake_timeout` and if within this time message wasn't received, this peer disconnects and adds to the Ban list.

When incoming connection is received, 

Outgoing:
```
    connect(peer.ip)
    handshake = sign(Handshake { protocol_version, genesis_hash, node_id.public_key }, node_id.secret_key)
    send(handshake)
```

Incoming:
```

```

### Peer gossip

Node that just joined the network might only have bootstapping nodes. We also expect those nodes to be at the capacity of `max_peers` constantly.

A node can send `PeersRequest` message, that peers respond with a subset of the peers that they have.
Specifically, out of the peers which a `last_known` is no longer than ~X hours. If there is greater number than constant `max_peers_response`, send a random subset of length `max_peers_response` of them.

### Account gossip



## Reputation and Ban

The important part of the attacker resilient peer-to-peer protocol is to be able to efficiently remove peers who are misbehaving. We also note, that IDs are easily switchable compared to IP addresses. Even though we use IDs to identify peers, reputation and banning happens on IP address level.

We identify list of possible attacks, their severity and resulting reaction of the node:

- Invalid signed handshake. Ban IP address. Note that user might end up in the situation when an attacker took over their router and via man-in-the-middle responds to messages with invalid signature. This node will be left without known peers, but we think this is the safest outcome and requires human intervention.

- Peer responds with false `latest_height` / `latest_weight`. The attacker might want to stall node in syncing mode, waiting for headers that don't exist by providing way to large `latest_height`. The only way to actually verify this is to try to pull headers from this peer. As we start requesting headers, a timer setup. If peer doesn't respond to the `HeaderRequest` within this time, we Ban the peer for a medium period of time. Additional heuristic can be added, which node will be banned if their `latest_height` is above some threshold of heights known from other peers.

- 

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

This is the technical portion of the NEP. Explain the design in sufficient detail that:

- Its interaction with other features is clear.
- It is reasonably clear how the feature would be implemented.
- Corner cases are dissected by example.

The section should return to the examples given in the previous section, and explain more fully how the detailed proposal makes those examples work.

# Drawbacks
[drawbacks]: #drawbacks

Why should we *not* do this?

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

Ethereum uses Kademlia table for new peer discovery.
Kademlia is a distributed hash table (DHT), whose function is mostly to store pieces of data across a peer-to-peer network. Kademlia wasn't also designed with the goal to prevent malicious agents attack (as usually it's used to store content addressable data which is self verifiable). [1] has shown some easy ways to attack Kademlia table peer-to-peer discovery process.

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- What parts of the design do you expect to resolve through the NEP process before this gets merged?
- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?
- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?

# Future possibilities
[future-possibilities]: #future-possibilities

Think about what the natural extension and evolution of your proposal would
be and how it would affect the project as a whole in a holistic
way. Try to use this section as a tool to more fully consider all possible
interactions with the project in your proposal.
Also consider how the this all fits into the roadmap for the project
and of the relevant sub-team.

This is also a good place to "dump ideas", if they are out of scope for the
NEP you are writing but otherwise related.

If you have tried and cannot think of any future possibilities,
you may simply state that you cannot think of anything.

Note that having something written down in the future-possibilities section
is not a reason to accept the current or a future NEP. Such notes should be
in the section on motivation or rationale in this or subsequent NEPs.
The section merely provides additional information.

# References

1. Low-Resource Eclipse Attacks on Ethereum’s Peer-to-Peer Network
