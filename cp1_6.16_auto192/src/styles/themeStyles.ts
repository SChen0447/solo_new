export const themeStyles: Record<string, string> = {
  monokai: `
/* Monokai Theme */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #75715e;
}
.token.punctuation {
  color: #f8f8f2;
}
.token.namespace {
  opacity: .7;
}
.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: #f92672;
}
.token.boolean,
.token.number {
  color: #ae81ff;
}
.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #a6e22e;
}
.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string,
.token.variable {
  color: #f8f8f2;
}
.token.atrule,
.token.attr-value,
.token.function,
.token.class-name {
  color: #e6db74;
}
.token.keyword {
  color: #66d9ef;
}
.token.regex,
.token.important {
  color: #fd971f;
}
.token.important,
.token.bold {
  font-weight: bold;
}
.token.italic {
  font-style: italic;
}
.token.entity {
  cursor: help;
}
`,

  'solarized-light': `
/* Solarized Light Theme */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #93a1a1;
}
.token.punctuation {
  color: #586e75;
}
.token.namespace {
  opacity: .7;
}
.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
  color: #268bd2;
}
.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.url,
.token.inserted {
  color: #2aa198;
}
.token.entity {
  color: #657b83;
  background: #eee8d5;
}
.token.atrule,
.token.attr-value,
.token.keyword {
  color: #859900;
}
.token.function,
.token.class-name {
  color: #b58900;
}
.token.regex,
.token.important,
.token.variable {
  color: #cb4b16;
}
.token.important,
.token.bold {
  font-weight: bold;
}
.token.italic {
  font-style: italic;
}
.token.entity {
  cursor: help;
}
`,

  dracula: `
/* Dracula Theme */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #6272a4;
}
.token.punctuation {
  color: #f8f8f2;
}
.token.namespace {
  opacity: .7;
}
.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: #ff79c6;
}
.token.boolean,
.token.number {
  color: #bd93f9;
}
.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #50fa7b;
}
.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string,
.token.variable {
  color: #f8f8f2;
}
.token.atrule,
.token.attr-value,
.token.function,
.token.class-name {
  color: #f1fa8c;
}
.token.keyword {
  color: #8be9fd;
}
.token.regex,
.token.important {
  color: #ffb86c;
}
.token.important,
.token.bold {
  font-weight: bold;
}
.token.italic {
  font-style: italic;
}
.token.entity {
  cursor: help;
}
`,

  nord: `
/* Nord Theme */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #616e87;
}
.token.punctuation {
  color: #d8dee9;
}
.token.namespace {
  opacity: .7;
}
.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: #8fbcbb;
}
.token.boolean,
.token.number {
  color: #b48ead;
}
.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #a3be8c;
}
.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string,
.token.variable {
  color: #d8dee9;
}
.token.atrule,
.token.attr-value,
.token.function,
.token.class-name {
  color: #ebcb8b;
}
.token.keyword {
  color: #88c0d0;
}
.token.regex,
.token.important {
  color: #d08770;
}
.token.important,
.token.bold {
  font-weight: bold;
}
.token.italic {
  font-style: italic;
}
.token.entity {
  cursor: help;
}
`,

  'github-light': `
/* GitHub Light Theme */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #6a737d;
}
.token.punctuation {
  color: #24292e;
}
.token.namespace {
  opacity: .7;
}
.token.property,
.token.tag,
.token.boolean,
.token.number,
.token.constant,
.token.symbol,
.token.deleted {
  color: #005cc5;
}
.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #032f62;
}
.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string {
  color: #d73a49;
}
.token.atrule,
.token.attr-value,
.token.keyword {
  color: #d73a49;
}
.token.function,
.token.class-name {
  color: #6f42c1;
}
.token.regex,
.token.important,
.token.variable {
  color: #e36209;
}
.token.important,
.token.bold {
  font-weight: bold;
}
.token.italic {
  font-style: italic;
}
.token.entity {
  cursor: help;
}
`,

  'one-dark': `
/* One Dark Theme */
.token.comment,
.token.prolog,
.token.doctype,
.token.cdata {
  color: #5c6370;
}
.token.punctuation {
  color: #abb2bf;
}
.token.namespace {
  opacity: .7;
}
.token.property,
.token.tag,
.token.constant,
.token.symbol,
.token.deleted {
  color: #e06c75;
}
.token.boolean,
.token.number {
  color: #d19a66;
}
.token.selector,
.token.attr-name,
.token.string,
.token.char,
.token.builtin,
.token.inserted {
  color: #98c379;
}
.token.operator,
.token.entity,
.token.url,
.language-css .token.string,
.style .token.string,
.token.variable {
  color: #abb2bf;
}
.token.atrule,
.token.attr-value,
.token.function,
.token.class-name {
  color: #e6c07b;
}
.token.keyword {
  color: #61afef;
}
.token.regex,
.token.important {
  color: #d19a66;
}
.token.important,
.token.bold {
  font-weight: bold;
}
.token.italic {
  font-style: italic;
}
.token.entity {
  cursor: help;
}
`
};
