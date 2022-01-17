// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

const math = require('remark-math');
const katex = require('rehype-katex');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'My Site',
  tagline: 'Dinosaurs are cool',
  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'near', // Usually your GitHub org/user name.
  projectName: 'NEPs', // Usually your repo name.

stylesheets: [
  {
    href: 'https://cdn.jsdelivr.net/npm/katex@0.13.24/dist/katex.min.css',
    type: 'text/css',
    integrity:
      'sha384-odtC+0UGzzFL/6PNoE8rX/SPcQDXBJ+uRepguP4QkPCm2LBxH3FA3y+fKSiJ+AmM',
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
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          editUrl:
            'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'NEAR',
        logo: {
          alt: 'My Site Logo',
          src: 'img/near_logo.svg',
        },
        items: [
//          {
//            type: 'doc',
//            docId: 'SUMMARY',
//            position: 'left',
//            label: 'Specification',
//          },
          {to: '/docs', label: 'Specification', position: 'left'},
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
                to: '/docs',
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
                href: 'https://stackoverflow.com/questions/tagged/docusaurus',
              },
              {
                label: 'Discord',
                href: 'https://discordapp.com/invite/docusaurus',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/docusaurus',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'NEAR',
                to: 'https://near.org',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/near/NEPs',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} NEAR, Inc. Built with Docusaurus.`,
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
