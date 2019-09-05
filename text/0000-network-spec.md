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

To provide actually secure and efficent routing, especially among the validators, we postulate that account information and cryptographic signatures backed directly or inderectly by stake are required.
This network specification describes all of the protocols and data structures to connect, handshake, discover peers and maintain connections and an integration with the blockchain itself.

This document should serve as reference for all the clients to implement networking layer.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

## System description

Our system is designed so that each node will have several active connections to other nodes and will maintain a "partial" view of the network to be able to route messages.
Each node has ID that is ED25519 public key derived from secret key known only to this node and an address of the form (IP,Port).
Additionally, active participants, such as block producers and other nodes that want to link their account information to the peer information have a string `account_id` and appropriate `public_key` which is associated with this account. Accounts maintained by blockchain itself, and can not be forged without breaking the blockchain itself.

### Goals

- Efficiency in network distribution.
  - Shard participants should connect among themselves.
  - Block producer should connect among themselves
- Low network overhead.
  - Any extra complexity introduced to sync information should not incur in a severe network overhead.
- Sybil / Eclipse attack resistant

## Storing network information

A client stores information about other nodes in three data structures. `known_peers` a long-term database, which is stored on disk and persists between reboots. And two short-term databases `active_peers` and `routing table` that start empty.

`known_peers`. The `known_peers` is stored on disk and contains information about each node that client has ever connected or recevied gossip about. There is no limit to the size of the `known_peers`.
Each entry of `known_peers` is tuple of `<node ID, IP address, TCP port, last_seen, status>`. Where `last_seen` is a timestamp when we received last message from this peer. If this was received from gossip, `last_seen` is 0. Status contains if this peer is currently unknown, connected, disconnected or banned.

`active_peers`. The `active_peers` maintains relevant information about currently connected peers. Such as their `<node ID, IP address, TCP port, last_seen, socket>`.

`routing_table`. The `routing_table` contains all connections known from the network among connected peers. It will be a graph that will allow to:

- Add new node.
- Add new connection between two nodes.
- Remove connection between two nodes.
- From node `s` (this node is fixed and represents ourself in the network) all direct connection which belong to a shortest path to node `u`.

All routing in the network happens between

## Bootstrapping

When node starts it have two lists:

- Bootstrap nodes, nodes that are well known in the eco-system as nodes that provide information about the network.
- Known peers, peers that this node has connected before in previous sessions and stored on disk to persist between runs. This list can be empty if this is first time to start the node.

Both of these lists are merged and node starts by connecting to `max_peers` random peers from this list.
If there is not enough peers in the lists, node periodically tries to connect to newly discovered peers with a exponential back off timeout (in case network is smaller than K in the first place) until it switches to *regular* mode. *Regular* mode means that node periodically checks if there is not enough peers (due to disconnects) and conncects to new peers.

Additionally, to prevent various eclipse attacks where attacker forces node to have all incoming connection to them, we require node to have at least `min_outgoing_peers` outgoing connections.

In pseudo code, this would look like:

```pseudo-code
  peers = (bootstrap | known_peers) - banned_peers
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

```pseudo-code
    connect(peer.ip)
    handshake = sign(Handshake { protocol_version, genesis_hash, node_id.public_key }, node_id.secret_key)
    send(handshake)
```

Incoming:

```pseudo-code
```

## Peer gossip

Node that just joined the network might only have bootstrapping nodes. We also expect those nodes to be at the capacity of `max_peers` constantly.

A node can send `PeersRequest` message, that peers respond with a subset of the peers that they have.
Specifically, out of the peers which a `last_known` is no longer than ~X hours. If there is greater number than constant `max_peers_response`, send a random subset of length `max_peers_response` of them. We should cap how much CPU time we are dedicating to this task, since it is with a node which is not an `active_peer`.

### Account gossip

If a nodes have one or more `account_id`s, it will send it as part of the peer gossip. Also (`account_id`, `peer_id`) pair should be announced periodically based on how much time to become a validator again and how much time since last announced.
In this document we will assume that every `account_id` is connected to exaclty one `peer_id` (though this may change).

## Balancing

**Simple approach**: If a node becomes a validator in epoch X, some time before epoch begins it will start making direct connections to all peers which are also validators in that epoch.

- **Pro**: Network routing penalty become close to zero.
- **Cons**: This may become infeasible due large number of open connections, if a node is part of several shards at the same time.

**Complex approach**: Only some connections are being built per shard. They agree on some connections (at least k) that should be built among participants. Since validators are well known in advance of every epoch, this subnet can be very efficient in term of it diameter. See this wikipedia page for inspiration of graph architectures.

## Reputation and Ban

The important part of the attacker resilient peer-to-peer protocol is to be able to efficiently remove peers who are misbehaving. Even though we use IDs to identify peers, reputation and banning happens on IP address level. We also note, that IDs are easily switchable compared to IP addresses, but both of them are cheap to forge.
We expect that some nodes enter the network without being active validators (no staking). This nodes must be able to connect, and have access to fetch blockchain data.
Since we expect that nodes keep their view of the network synced (all active connections between peers) we should avoid malicious nodes spamming honest nodes with large portions of useless connections that contains links to mostly ghost peer ids.

To address both of these issues we will be using *Reputation* and *Localization*.

### Reputation

Reputation starting epoch `X` is a combination of:

- Reputation starting epoch `X - 1`.
- Stake on the network on epoch `X`.
- Some sort of page rank algorithm on top of received endorsements.

Reputation of one node can vary from different points of view. Reputation will be impacted from other factors such as how good does a node behave routing messages to and from other peers. This can be measured using ping/pong like messages. How much time have we been connected to this network. How relevant is information we are receiving from this peer.

#### Ping/Pong

To detect if a route from node `u` to node `w` through direct peer `v` exist we can send ping messages and expect pong message. This can be done on some timeout. This will allow to determine live routes, and can be used to increase/decrease reputation. Pong message will be sent back using routing back mechanism.

### Localization

We maintain a graph with all connections from our point of view. We should build a DAG/Tree (this should be similar to have several routes for some peer) in such a way that every path from us to other nodes is:

- reasonably short.
- use high reputation nodes.

One idea to localize nodes in the network:

- From our POV we have infinite reputation.
- Build a directed graph where weight of edge [u -> v] is reputation of node [u].
- Build a maximum weighted directed spanning tree.

We only care for parts of the graph such that:

- We should be connected right now because we belong to the same shard (same for block producer).
- We are going to become part of the same shard soon. (same for block producer).
- They are nodes with high reputation from our POV.

Localization will be useful to determine whether a node/edge is relevant to us and relevant to a connected peer (it cares about). We will only send and accept new connections of relevant node/edges. If some connected peer spam us with irrelevant connections we should take action towards it. This action can be:

- decrease reputation
- ban
- notify + expect better behavior + ban otherwise

## Communication

Broadcasted messges:

- *Create connection between two nodes*. We should only broadcast based on [localization]. If a new connection is relevant to us we broadcast to other nodes as an important hop. Note: We can force a maximum depth, so we don't send a connection if its exceed some depth. If we connect to other node this is relevant to us. (This way we keep track of all peer at distance 2 from us).

- *Remove connection between two nodes*. We should not broadcast a removal if we didn't broadcast the creation. If node A receives a Remove connection [A, B] signed by B we should disconnect from B (probably malicious action by B). Also it is expected that nodes disconnect from each other when rebalancing network on epoch changes.

Broadcasting messages at the network level is the main source of network overhead unrelated to blockchain protocol level. We should keep this as low as possible.

### Syncing graphs

When we connect to a new peer we should exchange relevant portions of the network to each other progressively. Portions that involve only high reputable nodes and validators.

Edges are signed from both parties with timestamp. They should expire automatically after some period of time So they are re-broadcasted again. This period of time should be reasonably large so incur in small network overhead penalty.

### Routing

Routing mechanism specification.

- *Routing to*: A peer can only send a message to another peer (target) if it knows a path to it in its current view of the network. It will send a message through shortest path using Round Robin (among all direct peers that have shortest path to target it will pick one).

- *Routing back*: The network design establish that path to reputable nodes are know, so for messages that need to be routed back (to probably some not reputable node) every node in the path should be aware of a message that needs a response and will keep track of this submission hash and predecessor (only predecessor since full route might be unknown). This will allow new nodes to fetch information from other nodes in the network that doesn’t know him (only those who are directly connected should know him).

#### Round Robin details

When routing we will send message through shortests path, and here might be several direct connections that belong to some shortest path. For every direct connection we will keep a counter with how many submissions have we sent through it and always pick smaller number. If there is a new node joining its counter start equals to the current smallest number.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

This is the technical portion of the NEP. Explain the design in sufficient detail that:

- Its interaction with other features is clear.
- It is reasonably clear how the feature would be implemented.
- Corner cases are dissected by example.

The section should return to the examples given in the previous section, and explain more fully how the detailed proposal makes those examples work.

## Types of messages

Where we describe all possible types of messages happening at the networking level. Notice that protocol level messages are wrapped around ProtocolMessage. This specification should be agnostic to the content of such messages.

- Ping
- Pong
- Handshake
- ...
- ProtocolMessages.

## Security

Messages exchanged between routed (both direct or routed) are cryptographically signed with sender private key. Nodes ID contains public key of each node that allow other peer to verify this messages. To keep secure communication most of this message requires some nonce/timestamp that forbid a malicious actor reuse a signed message out of context.

While routing messages each intermediate hop should verify that message hash and signatures are valid before routing to next hop.

# Drawbacks
[drawbacks]: #drawbacks

## Possible attacks

We identify list of possible attacks, their severity and resulting reaction of the node:

- Invalid signed handshake. Ban IP address. Note that user might end up in the situation when an attacker took over their router and via man-in-the-middle responds to messages with invalid signature. This node will be left without known peers, but we think this is the safest outcome and requires human intervention.

- Peer responds with false `latest_height` / `latest_weight`. The attacker might want to stall node in syncing mode, waiting for headers that don't exist by providing way to large `latest_height`. The only way to actually verify this is to try to pull headers from this peer. As we start requesting headers, a timer setup. If peer doesn't respond to the `HeaderRequest` within this time, we Ban the peer for a medium period of time. Additional heuristic can be added, which node will be banned if their `latest_height` is above some threshold of heights known from other peers.

### Eclipse attack manipulating reputation

A malicious actor put as little stake as possible in the blockchain to become validator from as much peer ids as possible. All this peer id become relevant (maybe gaining reputation through time) and tries to flood some participants active connections with their forged peer ids.

Outbounds connections might not be an effective resource to avoid such situation if malicious actor plans it attack with some time, though waiting to all its nodes get high reputation (this is undetectable, mostly because malicious actor needs to do nothing bad).

Also in order to achieve this it can also corrupt (take control) of high reputation nodes which is not that unrealistic.

One defense against such an attack right now is part of the balance mechanism, where validators will make direct connections to other validators, hence keeping at least one connection to an honest node.

Proposal: We can fetch some reputable peers from a UDP channel from other nodes we know in the network and randomly rotate some (few) slots of our connected peers. Trying to establish this way new outbounds (also inbound) connections to other peers.

**WARNING**: This situation taken to an extreme might lead to a centralized system where all honest nodes are connected to a malicious node without knowing the existence of other honest nodes.

# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

Ethereum uses Kademlia table for new peer discovery.
Kademlia is a distributed hash table (DHT), whose function is mostly to store pieces of data across a peer-to-peer network. Kademlia wasn't also designed with the goal to prevent malicious agents attack (as usually it's used to store content addressable data which is self verifiable). [1](#references) has shown some easy ways to attack Kademlia table peer-to-peer discovery process.

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
[references]: #references

1. Low-Resource Eclipse Attacks on Ethereum’s Peer-to-Peer Network
