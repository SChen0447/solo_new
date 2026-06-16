export interface Theme {
  name: string;
  cssFile: string;
  backgroundColor: string;
  textColor: string;
  primaryColor: string;
}

export const themes: Record<string, Theme> = {
  monokai: {
    name: 'Monokai',
    cssFile: 'prism-monokai',
    backgroundColor: '#272822',
    textColor: '#F8F8F2',
    primaryColor: '#F92672'
  },
  'solarized-light': {
    name: 'Solarized Light',
    cssFile: 'prism-solarized-light',
    backgroundColor: '#FDF6E3',
    textColor: '#657B83',
    primaryColor: '#268BD2'
  },
  dracula: {
    name: 'Dracula',
    cssFile: 'prism-dracula',
    backgroundColor: '#282A36',
    textColor: '#F8F8F2',
    primaryColor: '#BD93F9'
  },
  nord: {
    name: 'Nord',
    cssFile: 'prism-nord',
    backgroundColor: '#2E3440',
    textColor: '#D8DEE9',
    primaryColor: '#88C0D0'
  },
  'github-light': {
    name: 'GitHub Light',
    cssFile: 'prism-github-light',
    backgroundColor: '#FFFFFF',
    textColor: '#24292E',
    primaryColor: '#0366D6'
  },
  'one-dark': {
    name: 'One Dark',
    cssFile: 'prism-one-dark',
    backgroundColor: '#282C34',
    textColor: '#ABB2BF',
    primaryColor: '#61AFEF'
  }
};

export type ThemeKey = keyof typeof themes;

export const defaultTheme: ThemeKey = 'monokai';
