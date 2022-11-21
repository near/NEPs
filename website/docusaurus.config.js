// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const math = require('remark-math');
const katex = require('rehype-katex');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'NEAR Protocol Specification',
  tagline: 'NEAR Protocol Specification',
  url: 'https://nomicon.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'near', // Usually your GitHub org/user name.
  projectName: 'NEPs', // Usually your repo name.
  plugins: [],
  stylesheets: [
    {
      href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
      type: 'text/css',
      integrity: 'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
      crossorigin: 'anonymous',
    },
  ],
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          "editUrl": "https://github.com/near/NEPs/edit/master/website",
          remarkPlugins: [math],
          rehypePlugins: [katex],
          "showLastUpdateAuthor": true,
          "showLastUpdateTime": true,
          "path": "../specs",
          "routeBasePath": '/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
        },
        gtag: {
          trackingID: 'G-G8LCVP41F0',
          anonymizeIP: true,
        },
      }),
    ],
  ],
  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true
      },
      navbar: {
        title: 'Nomicon',
        logo: {
          alt: 'NEAR Logo',
          src: 'img/near_logo.svg',
          srcDark: 'img/near_logo_white.svg',
        },
        items: [
          {
            to: '/',
            label: 'Specification',
            position: 'left'
          },
          {
            href: 'https://docs.near.org/',
            label: 'Dev Docs',
            position: 'left',
          },
          {
            href: 'https://wiki.near.org/',
            label: 'Wiki',
            position: 'left',
          },
          {
            href: 'https://github.com/near/NEPs',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Specification',
                to: '/',
              },
              {
                label: 'Dev Docs',
                to: 'https://docs.near.org',
              },
              {
                label: 'Wiki',
                to: 'https://wiki.near.org',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/nearprotocol',
              },
              {
                label: 'Discord',
                href: 'https://near.chat',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/NEARProtocol',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'SDK Docs',
                to: 'https://near-sdk.io/',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/near/NEPs',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} <a href="https://near.org">NEAR Protocol</a> | All rights reserved | hello@near.org`,
      },
      algolia: {
        // The application ID provided by Algolia
        appId: "Q3YLAPF2JG",
        // Public API key: it is safe to commit it
        apiKey: "85c789900f6274dc604e76c92c565e5f",
        indexName: "nomicon",
        // Optional: see doc section below
        contextualSearch: false,
        // Optional: Algolia search parameters
        searchParameters: {
          clickAnalytics: true,
          analytics: true,
          enableReRanking: true,
          hitsPerPage: 30,
        },
        //... other Algolia params
        placeholder: "Search the Docs...",
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        "additionalLanguages": [
          "rust", "java", "python", "ruby", "go", "toml"
        ]
      },
    }),
};

module.exports = config;
