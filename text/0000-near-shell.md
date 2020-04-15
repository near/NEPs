- Proposal Name: near-shell
- Start Date: 2020-02-03)
- NEP PR: [nearprotocol/neps#0000](https://github.com/nearprotocol/neps/pull/0000)
- Issue(s): link to relevant issues in relevant repos (not required).

# Summary
[summary]: #summary

`near-shell` is one of the primary tools NEAR developers must use to develop and interact with NEAR networks and smart contracts.  Today, `near-shell` contains the base commands for account creation and deletion, login, viewing account state and keys, sending tokens, creating staking transactions, and building, deploying, and calling smart contracts. There are more opportunities to integrate core NEAR features to expose them directly to users.  This proposal is to enhance `near-shell` to represent all major functionality of NEAR.  For example, validator node management, network selection, native OS key management and integration, smart contract development (including testing, and interaction) could be added.  

`near-shell` is an excellent tool to attract and engage new NEAR developers, both core and contract level, and if it contains all the required features to select and configure and deploy NEAR networks, nodes, crypto assets (i.e., keys), accounts, and wallets, it can be the ideal single-entry point for those potential new hackers.  

# Motivation
[motivation]: #motivation

These enhancements are intended to simplify and enhance developer and user productivity by providing a single command-line tool which exercises all major features of NEAR. As each major piece of NEAR functionality is added to `near-shell`, we should see utilization of each of those features increase.  Additionally, community mindshare and understanding of NEAR should increase as `near-shell` will contain detailed help documentation for each major feature with clear examples of use, just like Linux man pages and/or other major CLI tools which have integrated help for each command.

# Guide-level explanation
[guide-level-explanation]: #guide-level-explanation

### Projects (currently)

Currently, NEAR projects (for example, one generated using `create-near-app`) hold the configuration in the project's file:

`src/config.js`

**Note**: the active configuration can have values overridden by flags.

After the user completes the instructions from running `near login`, the project has a new directory where private key(s) are stored:

`./neardev`

### Validator nodes (currently)

Currently, validators use scripts to run a node.

Validator nodes using the `nearcore` repository follow instructions that will create their keys in the user's home directory, not the project directory. It is located in:

`~/.near`

At this time, it is not advised to change this directory or try to use it for multiple purposes. Validator data has a monopoly on that folder.

## Settings, config, and key management

()From this section forward, the discussion is no longer about how `near-shell` works at the time of this writing, but what is proposed.)

Project-level **settings**, connection **configuration**, and **key management** are the three types of stored data necessary for developers to reliably build and deploy projects. 

### Definitions:

#### Settings
[project-level-settings]: #project-level-settings
These are key-values reflecting how `near-shell` behaves when called within a NEAR project.
    
**Example**: a developer using OS X uses `near login` with access to a browser, whereas a validator runs `near login` on a CentOS box with no UI or browser. A user prompt may ask "Is this login from a computer with a browser?" The answer is then stored in key-value format in the project-level directory so it can be referenced later, skipping the prompt in the future.

Besides answers to user prompts, project-level settings also store information about the last version of `near-shell` used in this project. For more information, please see [Upgradability](#upgradability).
    
#### Configuration
A key-value storage (typically JSON) containing information.

- `networkId` - similar to an environment to work on (ex: 'staging')
- `nodeUrl` - URL to RPC
- `contractName` - NEAR account name for smart contract
- `walletUrl` - URL to NEAR Wallet
- `helperUrl` - URL to project helping with token dissemination
- `masterAccount` - NEAR account used for continuous integration
    
**Example**: As a user, I want to deploy a contract to my localnet instead of testnet during development. I will provide flags and/or configuration so that `near-shell` can determine where to connect, for what contract, and on behalf of which NEAR account.

#### Key management
The storage of an account id and a corresponding private key.
    - `keyPath` - an argument used by `near-shell` specifying the path to the unencrypted file containing an account's private key.
    
The unencrypted file contains the keys:
- `account_id`
- `private_key`

`near-shell` will look for keys in a specific order. This list is in the prioritized order and can be understood to mean, "if the key is not found here, then try the next location/store."

1. Environment variables:
    - `NEAR_ACCOUNT_ID`
    - `NEAR_PRIVATE_KEY`
    
2. Operating system key management:
    - OS X - use of built-in `/usr/bin/security` [cli tool](https://www.unix.com/man-page/osx/1/security/).
    - Linux - use of `secret-tool` [cli command](https://specifications.freedesktop.org/secret-service/latest/).
    - Windows - possibly [use cmdkey.exe](https://social.technet.microsoft.com/Forums/en-US/268cb72e-0916-4219-8543-219092d2fb39/command-line-for-credential-manager?forum=w7itprosecurity) although implementation is not certain

3. Project directory (`/Users/friend/projects/my-awesome-app/.near`)
    - Instead of `neardev` in the project directory, it is now called `.near-credentials`

4. Home directory (`/Users/friend/.near-credentials`)

**Note**: during implementation it's advised to have the key storage options extendable. As the project grows, developers in the NEAR Collective may choose to add integrations with password management applications or hosted key solutions.

## Translation

It's important to invite the international community into developing with NEAR. Translation of user-facing content is essential for:
- Help commands (the text describing what a command does and how to use it)
- Error and logging messages

Language preference can be set in two ways:
- Using environment variables (i.e., parsed from `process.env.LANG`, and the default assignment)
- Set explicitly in [project-level settings](#project-level-settings) using [ISO 639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)

Example content from `<project-path>/.near-config/settings.env`:
```json
…
  "language": "en"
…
```

Commands and subcommands (ex: `call` or `deploy`) are not translated and will be in English.

## Upgradability
[upgradability]: #upgradability

As `near-shell` matures, updates may/will cause a user's project to become outdated. For instance, this NEP proposes to rename the project directory `neardev` to `.near-credentials`. Developers with existing `neardev` directories will either need to manually rename the folder, or `near-shell` will have to look in two places for the key files.

This proposal declares that `near-shell` will have a mechanism to make such upgrades possible. This is not possible, however, without keeping track of which version of `near-shell` was most recently used on a project.

**Example scenario**: a user begins developing a dApp on NEAR using `near-shell` version 0.19.0. The user takes a sabbatical for a few months and returns to the project with a new computer. The new computer installed `near-shell` version 0.23.1. The first time this user runs a command in this old project, migrations are run ensuring the project stays current.

Of the three types of storage mentioned before (project-level settings, connection configuration, and key management) the saved version information belongs to the project-level settings. It's possible that a user will have multiple dApps that are used less frequently than others. Each project, especially those used less frequently, must have their own record of which version of `near-shell` was most recently used.

The location of these settings is:

`./.near-config/settings.env` for a project.

For example:
`/Users/friend/near-projects/guest-book/.near-config/settings.env`

The settings will exist as normal key-value pairs seen in environment variable files:

```bash
…
LAST_SHELL_VERSION="0.19.1"
…
```

Using middleware, `near-shell` will check the current version against the key `LAST_SHELL_VERSION` of the settings file and run any necessary migrations.

### Migrations

The folder structure within `near-shell` will have migration files per minor version as illustrated here:

```bash
└── middleware
   └── migration
      ├── README.md
      ├── scripts
      │  ├── 0.19.x.js          ⟵ logic to run for 0.19.0 to 0.19.N
      │  ├── 0.20.x.js          ⟵ logic to run for 0.20.0 to 0.20.N
      │  └── x.x.x-template.js  ⟵ template for adding new minor version migrations
      └── shell-upgrade.js      ⟵ contains checks for current version against stored version, etc.
```

An example of a migration script might be:

```javascript
const upgrade = async (lastPatchVersion) => {
    if (lastPatchVersion < 2) {
      // implement essential logic that changed from x.x.0 to x.x.1
      // check for existence of neardev/dev-account.env file, create if possible
      const fs = require('fs');
      const util = require('util');
  
      (async () => {
          const oldDevDeployFile = 'neardev/dev-account';
          const newDevDeployFile = 'neardev/dev-account.env';
    
          if (fs.existsSync(newDevDeployFile)) {
              // user already has the latest near-shell
              return;
          }
    
          if (fs.existsSync(oldDevDeployFile)) {
              // user has an outdated near-shell, create necessary file
              const readFile = (filePath) => util.promisify(fs.readFile)(filePath, 'utf8');
              const writeFile = (filePath, data) => util.promisify(fs.writeFile)(filePath, data);
              // read and rewrite the old file into the new format
              const fileData = await readFile(oldDevDeployFile);
              await writeFile(newDevDeployFile, `CONTRACT_NAME=${fileData}`);
          }
      })();
    }
    
    if (lastPatchVersion < 6) {
        // implement essential logic that changed from x.x.2 to x.x.6
    }
    
    …
};

exports.upgrade = upgrade;
```

The file `shell-upgrade.js`, after comparing the current version to the setting in `./.near-config/settings.env`, will determine how many migration scripts need to run, and call the `upgrade()` function on them in order. When complete, it will update the `LAST_SHELL_VERSION` key in the project-level settings file. At this time the project is considered current.

## `near-shell` Top-Level Commands 

### `near network <command>`

This command category is used to select and configure NEAR networks for a `near-shell` user.  This category manipulates the user's active configuration to allow a user to specify NEAR network details via the CLI instead of manually editing config files.

Sub-commands for `network` include:

* `near network list` : Display the current list of networks for the current instance of `near-shell`.  
* `near network status` :  Show the user's current network configuration.
* `near network select` : Select a NEAR network as the default network for subsequent `near-shell` commands as well as the network configuration for a local server validator node managed by this instance of `near-shell`.
* `near network add` : Add a network to the users's `~/.near` config files.
* `near network remove` : Remove a network from the `~/.near` config files.
* `near network monitor` : Interactively monitor one or more NEAR networks in a curses-like interface updated in a specified interval, default of 1s.
* `near network help` : Display help on network subcommands. 

### `near account <command>`

This category is used to create, select, and configure accounts on NEAR networks for a given `near-shell` user.  

* `near account list`   : Display list of accounts configured on local host.
* `near account status` : Display status of active or specified account, including token amounts, locked, etc.
* `near account send`   : Send tokens from active or specified account to another NEAR account or contract.
* `near account create` : Create a new account or sub-account.
* `near account delete` : Delete an account or sub-account.
* `near account create-key` : Delete an account or sub-account.
* `near account revoke-key` : Delete an account or sub-account.
* `near account select` : Select an account from the list of locally configured accounts as the active account.
* `near account login`  : Log in the current active or specified account.
* `near account logout` : Log out the current active or specified account. Essentially revoking a full access key.
* `near account help`   : Display help on account subcommands.

### `server`

These commands are used to administer a NEAR server validator node.  Currently, only one server per `near-shell` is proposed; however, multiple servers per physical host should be considered.

* `near server status`  : Display status of NEAR validator server on current host.
* `near server start`   : Start NEAR validator server on current host.
* `near server stop`    : Stop NEAR validator server on current host.
* `near server monitor` : Interactively display NEAR validator server status on current host.
* `near server tail`    : Tail the log of the NEAR validator server on current host.
* `near server help`    : Display help on server subcommands.
* `near server stake`   : Stake tokens on the configured network with the active or specified account

### `near contract <command>` 
* `near contract list`
* `near contract status`
* `near contract add`
* `near contract remove`
* `near contract build`
* `near contract deploy`
* `near contract call`
* `near contract view`

### `near config <command>`
* `near config`         : List the location of active configuration file if it's loaded, or default config settings
* `near config set`     : Set a key in the active configuration, or if using default, create a config file in the home directory with defaults and the specified key and value

## Command input can be inline and file-based

Some commands in `near-shell` may become long and difficult to type on the command line. End users with a standard terminal application may have lengthy arguments that are better saved to a file.

Flags may be done inline (default):

`near call my_dapp my_function '{"key": "value_19"}'`

or defined in a file:
 
`near call my_dapp my_function -f ./params.json`

This `-f` or `--fromFile` argument is added to two commands:
1. `call`
2. `view`

Other commands may be added in the future.

### User Stories

These enhancements to `near-shell` aim to increase user and developer adoption by centralizing and optimizing all interactions with NEAR functionality. `near-shell` today is a thin and lightweight set of features which enable the use of each NEAR product offering.  Specifically, `near-shell` is required to use NEAR products today. For example, to stake, send tokens, create and delete accounts, view public keys, build and deploy smart contracts, call smart contract methods, and log in through NEAR Protocol's wallet. Each of these features are critical to all NEAR products.

If `near-shell` is required, it makes sense to enhance `near-shell` to include other features critical to user and developer interactions. The commands proposed above enhance `near-shell` to include validator node deployment and control for both local and distributed development, i.e., using a local network for offline development vs. testnet as a live network used by others, and to be able to select configure and select networks.

Here are a few user stories to demonstrate the utility of these enhancements.

As a user, I want the option to have my operating system prompt for my user password before deploying a contract.

As a user, I want to be able to have multiple projects that use the same account (and corresponding key(s)) without having to login to each project.

As a user, I want to be able to instructions for commands in my own language.

As a user, I want to be able to come back to a project months later, upgrade tooling, and face no issues building and deploying.

#### Creating and Configuring Networks

When a user or developer wants to try out a simple smart contract or maybe just use NEAR's wallet to send or account for tokens, the user will want to select the network--select a specific blockchain, be it local or a live multi-user chain--to interact with.  Today, all network configuration is contained in the ~/.near directory with only a single network configured at any given moment.  The ~/.near directory could contain configurations for multiple networks.  The network our documentation assumes today is testnet, and the ~/.near directory is configured whenever `near-shell` is started and the user attempts to create or log in to an account.

This NEP proposes that `near-shell` be enhanced to enable multiple networks to be added, configured, and removed using new commands under a network category of commands.

Example:

1.  A user or developer wants to interact with a local development network to test a simple smart contract.
2.  User installs `near-shell`.
3.  User runs `near-shell` for the first time.  If there is no network configured, `near-shell` informs the user that a default network is configured for local interaction with a name of localnet.

1.  A user or developer wants to interact with NEARs active testnet network.
2.  The user lists the networks currently configured:  `near network list`.  
3.  The user, by default, is presented with a list of networks with only one entry: `localnet`
4.  Since, after these enhancements, `near-shell` creates a localnet by default, the user will need to add and select a new network configuration.  The user executes the shell command:  `near network add testnet <options>`

etc. TBD.

# Reference-level explanation
[reference-level-explanation]: #reference-level-explanation

This is the technical portion of the NEP. Explain the design in sufficient detail that:

- Its interaction with other features is clear.
- It is reasonably clear how the feature would be implemented.
- Corner cases are dissected by example.

The section should return to the examples given in the previous section, and explain more fully how the detailed proposal makes those examples work.

---

The programming language for `near-shell` has not been determined yet but there have been opinions regarding proper, future-proof implementation.

Long term goals to keep in mind:
- Upgradable, but also able to lock a specific version.
- Where possible, avoid single point of failures. This is in regards to using a package manager in particular.
    - An official installer for multiple operating systems may be advised here, where trusted OS or GPG keys can verify the shell.
- Able to traverse directory structures from all operating systems
    - This applies particularly to Windows where backslashes are used in the default command prompt.
- Limited dependencies to abate unforeseen issues.

# Drawbacks
[drawbacks]: #drawbacks

Why should we *not* do this?

* The download size of `near-shell` will increase.  The amount of increase will be determined by the code and libraries required to add the ability to deploy a validator node.
* The complexity of `near-shell` increases whenever a new command is added.
* Today, the configuration of the NEAR networks is instigated and controlled using the `nearcore` repository.
* Not all users will want to run a validator node.
* These proposals increases the dependency chain of `near-shell` to include Rust nearcore libraries and configuration.


# Rationale and alternatives
[rationale-and-alternatives]: #rationale-and-alternatives

## Why is this design the best in the space of possible designs?

Today is difficult to communicate and introduce distributed Web concepts and features to users and developers.  To address this, NEAR developers and products should reduce the overall complexity of distributed Web application development and create a centralized interface to all NEAR distributed application features and functionality.

Current best design practices for blockchain, wallets, and distributed Web applications attempt to mitigate blockchain interaction complexities by performing all required steps for interaction and feature use by *delaying* complex interactions and *encapsulating* multiple steps into as few interactions as possible.  The enhancements proposed here embrace multiple facets of NEAR features by including the most complicated feature interactions (i.e., configuring multiple networks, account creation and configuration, starting and managing NEAR validator nodes, etc.) and allow complex interactions with NEAR's blockchain features to be delayed until absolutely required, i.e., validator node configuration and deployment is available immediately, on-demand, only as needed, with no extra steps required to run a local network or an active distributed blockchain network.  The user is not required to pull a separate repository, hence *delaying* a relatively complex product interaction and practically eliminating most of the confusion introduced by fetching and inspecting another NEAR github repository.

These `near-shell` enhancements *encapsulate* multiple features and processes required to deploy and configure multiple networks. 


- What other designs have been considered and what is the rationale for not choosing them?

The current `near-shell` design is the default.  Other designs might be ones that do not include the ability to configure and deploy active validator nodes.  Also, another approach might be to not use a shell at all.  Instead, NEAR might create GUI applications, e.g., electron or Web server-based configuration management where the user starts a local application which provides a port towards which the user can point their local Web browser to configure NEAR accounts, networks, and nodes.

- What is the impact of not doing this?

Users will not have a single application which enables configuration and management of all NEAR features.  Instead, multiple repositories with disparate commands and configuration will be required to use NEAR Protocol's distributed Web blockchain.

# Unresolved questions
[unresolved-questions]: #unresolved-questions

- What parts of the design do you expect to resolve through the NEP process before this gets merged?

aloha - remove all the stuff about ~/.near

NEAR developers must weigh in on the impact of including validator node configuration.  Also, the `~/.near` directory is currently created by `nearcore`.  Decisions must be made about whether or not NEAR's configuration should be managed by `near-shell` instead of whenever a validator node is executed.

- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?

The management of the `~/.near` directory should be resolved when these enhancements are stabilized.  Also, the selection of the categories of commands and the commands themselves will need to be fleshed out to optimize both user and developer experiences when interacting with NEAR Protocol's distributed Web blockchain platform  offering.

- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?

Out of scope is smart contract development and debugging.  However, future versions of `near-shell` might include specific commands that enable the debugging and optimization of smart contract deployments.


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
