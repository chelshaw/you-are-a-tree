# You Are A Tree

You Are A Tree is a meditative nature game. You are a tree. Survive as many cycles as possible by growing, adapting, and giving back to the systems that sustain you.

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.12.5 create --template minimal --types ts --add prettier vitest="usages:unit,component" eslint --install pnpm you-are-a-tree
```
