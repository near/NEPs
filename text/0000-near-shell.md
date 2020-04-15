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

## Settings, config, and key management

Project-level **settings**, connection **configuration**, and **key management** are the three types of stored data necessary for developers to reliably build and deploy projects.
 
```
─ awesome-near-project  ⟵ NEAR dApp
 ├── .near-config       ⟵ Stores project-level settings and connection configuration
 │  ├── connections     ⟵ Stores values needed to connect and deploy a contract, except keys
 │  │  ├── default.js   ⟵ Default configuration is for development
 │  │  └── localnet.js  ⟵ Custom connection added by user for localnet
 │  └── settings.js     ⟵ Stores near-shell settings, how shell behaves when run in this project
 └── .near-credentials  ⟵ Previously "neardev" this directory contains private key inforamtion
    └── default         
       └── alice.json   ⟵ NEAR account "alice" has private key information here
```

### Definitions:

#### Settings
[project-level-settings]: #project-level-settings
These are key-values reflecting how `near-shell` behaves when called within a NEAR project.
    
**Example**: a developer using OS X uses `near login` with access to a browser, whereas a validator runs `near login` on a CentOS box with no UI or browser. A user prompt may ask "Is this login from a computer with a browser?" The answer is then stored in key-value format in the project-level directory so it can be referenced later, skipping the prompt in the future.

Besides answers to user prompts, project-level settings also store information about the last version of `near-shell` used in this project. For more information, please see [Upgradability](#upgradability).

As shown in the directory structure above, this file is located in the project directory at:

`.near-config/settings.js`

In summary, "settings" are key-value pairs that are set by `near-shell` and relate to the behavior of how it operates in a given project directory. They do not relate to the development or deployment of smart contracts.
    
#### Configuration
Configuration are key-value pairs that relate to development and deployment of smart contracts and refer to *connection* information.

**Example**: As a user, I want to deploy a contract to my localnet instead of testnet during development. I will provide flags and/or modify configuration so that `near-shell` can determine where to connect, for what contract, and on behalf of which NEAR account.

Contains:

* `networkId`       : Similar to an environment to work on (ex: 'staging')
* `nodeUrl`         : URL to the NEAR node
* `contractName`    : NEAR account name for the smart contract
* `walletUrl`       : URL to NEAR Wallet
* `helperUrl`       : URL to the contract helper that provides tokens upon account creation
* `masterAccount`   : When creating "child" accounts, `masterAccount` is the "parent" and source of initial Ⓝ balance
* `configFile`      : Explicitly specifies the location of the config file containing connection information. Default location is `.near-config/connections/default.js`    

As shown in the directory structure earlier, this file is located in the project directory at:

`.near-config/connections/default.js`

**Note**: at the time of this writing, configuration is read from the project level at:

`src/config.js`

This is a file containing several environment configurations with a default, which the user can choose by setting the environment variable `NODE_ENV`. Configurations will no longer be set in that manner, but stored in files.

For example, the command:

`near contract view near-game topPlayers --env localnet`

will call the function `topPlayers` on the contract `near-game` that is deployed to localnet. The connection information will be read from the file: `.near-config/connections/localnet.js`.

Users may add, remove, or modify connection environments using [commands detailed later](#commands-config) in this spec.

#### Key management
[key-management]: #key-management
The storage of an account id and a corresponding private key.
* `keyPath`     : An argument used by `near-shell` specifying the path to the key file.
    
The key file file contains the keys:
* `type`        : Options include 
    - `unencrypted`     : An unencrypted file containing an account's private key
    - `native_osx`      : Private key stored with OS X key management 
    - `native_linux`    : Private key stored with Linux-based system's key management 
    - `native_windows`  : Private key stored with Windows key management
* `account_id`  : The NEAR account name
* `private_key` : The plain-text private key, used when `type = "unencrypted"` 

`near-shell` will look for keys in a specific order. This list is in the prioritized order and can be understood to mean, "if the key is not found here, then try the next location/store."

1. Environment variables:
* `NEAR_ACCOUNT_ID`
* `NEAR_ACCOUNT_TYPE`
* `NEAR_PRIVATE_KEY`

2. Project directory (`/Users/friend/projects/my-awesome-app/.near-credentials`)

3. Home directory (`/Users/friend/.near-credentials`)

If the key type among the `native_*` values, the operating system key management handles:

* OS X      : Use of built-in `/usr/bin/security` [cli tool](https://www.unix.com/man-page/osx/1/security/).
* Linux     : Use of `secret-tool` [cli command](https://specifications.freedesktop.org/secret-service/latest/).
* Windows   : Possibly [use cmdkey.exe](https://social.technet.microsoft.com/Forums/en-US/268cb72e-0916-4219-8543-219092d2fb39/command-line-for-credential-manager?forum=w7itprosecurity) although implementation is not certain.

This prioritized order allows project-level configuration to take priority over the home directory, offering an improved user experience.

As an example, a user having credentials saved in their home directory will be able to use the `--accountId` flag to use keys from any project regardless of location. Said another way, the user does not need to run `near login` inside each project in order to access the keys.

Formerly, the `neardev` folder contained the key files for a project. It is now `.near-credentials`. This folder is not nested within `.near-config` deliberately. Having this folder with "credentials" at the top-level of a project makes it apparent that it contains sensitive information and should not be revisioned or archived.

**Note**: as the project grows, developers in the NEAR Collective may choose to add integrations with password management applications or hosted key solutions. Hence, expect the number of `type` options to increase.

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

**Example scenario**: a user begins developing a dApp on NEAR using `near-shell` version 0.19.0. The user takes a sabbatical for a few months and returns with a new computer, cloning the old project. The new computer installed `near-shell` version 0.23.1. The first time this user runs a command in this old project, migrations are run ensuring the project stays current.

Of the three types of storage mentioned before (project-level settings, connection configuration, and key management) the saved version information belongs to the project-level settings. It's possible that a user will have multiple dApps that are used less frequently than others. Each project must have their own record of which version of `near-shell` was most recently used.

The location of these settings is:

`.near-config/settings.js` for a project.

For example:
`/Users/friend/near-projects/guest-book/.near-config/settings.js`

In this proposal, the file is shown as JavaScript. This is not a hard requirement, as as key-value pairs could also be in the form of environment variables:

```bash
…
LAST_SHELL_VERSION="0.19.1"
…
```

Using middleware, `near-shell` will check the current version against the key `lastShellVersion` (or `LAST_SHELL_VERSION`) of the settings file, then run any necessary migrations.

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
      // Example: the new minor version 0.24.0 changes the neardev directory to .near-credentials
      // Logic here that checks for the absense of .near-credentials, the existence of neardev, and renames accordingly
    }
    
    if (lastPatchVersion < 6) {
        // implement essential logic that changed from x.x.2 to x.x.6
        // Example: all keys in the .near-credentials need an additional key for "type"
        // Logic looping through adding new key to existing files
    }
    
    …
};

exports.upgrade = upgrade;
```

Shown in the directory structure above is the file `shell-upgrade.js`. This file will, after comparing the current version to the last used version in `./.near-config/settings.js`, determine how many migration scripts are needed to run. It will loop through the necessary files calling the `upgrade()` function on them in the proper version order. When complete, it will update the `lastShellVersion` key in the project-level settings file. At this time the project is considered current.

**Note**: migrations do not have to fix backwards-incompatible changes. Migrations can also improve experience by, for example, removing orphaned files, make safety checks and show warnings, etc.

## Prompts

Various user prompts will enhance the experience of `near-shell` by providing options. These prompts have the option to save answers to that identical future prompts may be skipped if desired. As mentioned, the answers will be saved as **settings** on the project level.

Example:
`/Users/friend/near-projects/.near-config/settings.js` has:

```javascript
…
"alwaysSaveToLocation": "home"  ⟵ example: user chose to always save keys to home directory when running "near login"
…
```

The number of prompts will grow beyond what can be captured in this spec. A number of possible prompts would be:

- Is this project on an OS expected to have a browser and UI
- When creating an account, always fund new accounts with the NEAR contract helper
- Always run migrations in this project when applicable
- Never run migrations in this project

## `near-shell` Commands 

### `near account <command>`

This category is used to create, select, and configure accounts on NEAR networks for a given `near-shell` user.  

* `near account list`   : Display list of accounts configured in the current directory and home directory
* `near account status` : Display status of active or specified account, including token amounts, locked, etc.
* `near account send`   : Send tokens from active or specified account to another NEAR account or contract.
* `near account create` : Create a new account or sub-account.
* `near account delete` : Delete an account or sub-account.
* `near account create-key` : Delete an account or sub-account.
* `near account revoke-key` : Delete an account or sub-account.
* `near account select` : Select an account from the list of locally configured accounts as the active account.
* `near account login`  : Log in the current active or specified account.
* `near account logout` : Log out the current active or specified account. Essentially revoking a full access key.
* `near account secure` : Finds the key file for an account name, converts it to use OS-level key management via a command line wizard.
* `near account --help`   : Display help on account subcommands.

### `near config <command>`
[commands-config]: #commands-config

* `near config`         : List the location of active configuration file if it's loaded, or default config settings
* `near config add`     : Set a key in the active configuration, or if using default, create a config file in the home directory with defaults and the specified key and value
* `near config remove`   : Removes a configuration file. (Example: removes `.near-config/connections/localnet.js`)
* `near config wizard`   : Runs through a command-line wizard for an environment, allowing user to modify the values.

### `near contract <command>`

* `near contract deploy`    : Deploys the contract in the project directory (Default: `out/main.wasm`)
* `near contract call`      : Calls a function that may mutate state
* `near contract view`      : Calls a function that reads state, does not mutate
* `near contract estimate`  : Estimates gas consumption of a function call on a contract
* `near contract --help`

## Command input can be inline and file-based

Some commands in `near-shell` may become long and difficult to type on the command line. End users with a standard terminal application may have lengthy arguments that are better saved to a file.

Flags may be done inline (default):

`near call my_dapp my_function '{"key": "value_19"}'`

or defined in a file:
 
`near call my_dapp my_function -f ./params.json`

This `-f` or `--fromFile` argument is added to two commands:

1. `near contract call`
2. `near contract view`

Reading from a file may be added to other commands in the future.

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

TODO: - move some stuff down here

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

TODO: - remove all the stuff about ~/.near

NEAR developers must weigh in on the impact of including validator node configuration.  Also, the `~/.near` directory is currently created by `nearcore`.  Decisions must be made about whether or not NEAR's configuration should be managed by `near-shell` instead of whenever a validator node is executed.

- What parts of the design do you expect to resolve through the implementation of this feature before stabilization?

The management of the `~/.near` directory should be resolved when these enhancements are stabilized.  Also, the selection of the categories of commands and the commands themselves will need to be fleshed out to optimize both user and developer experiences when interacting with NEAR Protocol's distributed Web blockchain platform  offering.

- What related issues do you consider out of scope for this NEP that could be addressed in the future independently of the solution that comes out of this NEP?

Out of scope is smart contract development and debugging.  However, future versions of `near-shell` might include specific commands that enable the debugging and optimization of smart contract deployments.


# Future possibilities
[future-possibilities]: #future-possibilities

### `near network <command>`

This command category is used to select and configure NEAR networks for a `near-shell` user.  This category manipulates the project's configuration to allow a user to specify NEAR network details via the CLI instead of manually editing config files.

Sub-commands for `network` include:

* `near network list` : Display the current list of networks for the current instance of `near-shell`.  
* `near network status` :  Show the user's current network configuration.
* `near network select` : Select a NEAR network as the default network for subsequent `near-shell` commands as well as the network configuration for a local server validator node managed by this instance of `near-shell`.
* `near network add` : Add a network to the users's `~/.near` config files.
* `near network remove` : Remove a network from the `~/.near` config files.
* `near network monitor` : Interactively monitor one or more NEAR networks in a curses-like interface updated in a specified interval, default of 1s.
* `near network help` : Display help on network subcommands.

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

# From here to there

This section highlights actionable items needed to get from the current state of the project to this spec. It is not exhaustive, but rather can be used to jog memories and start the conversation on atomic tasks.

* Remove `near build`   : With multiple languages in the future and multi-contract dApps, we cannot reliably run a single command to build. It needs to be communicated that the user will have to run a command or build script (not using `near-shell`) for this.
* Keys stored in `neardev` need to have an additional key added: `"type": "unencrypted"`
* The `neardev` folder needs to be renamed to `.near-credentials`
* Add `--env` flag so that config will load proper file.
