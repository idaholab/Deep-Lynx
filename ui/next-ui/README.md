# DeepLynx UX

This is a NextJS application

## Development

To start developing, create a `.env` file in the root directory (adjacent to this `README.md`), and insert a DeepLynx `API_KEY`, `API_SECRET`, and `TOKEN`.

Start the app by navigating to this directory in your terminal, and running `npm run dev`. The application should startup and pull in the `.env.local` you created.

Presently the UX looks to the `DEEPLYNX_URL` for data.

### Important Notes

There is no auth at this time. To get into your container, you should already have one created at whatever DeepLynx instance you're pointing to. Navigate to `http://localhost:3000/containers` to hit the container selection component.

## Best Practices

### Source Code

#### (main)

Most of the application source code lives under the `(main)` directory. Depending on which container you select, the route is dynamically generated through `[containerID]`, where the application's constituent modules live.

#### lib

Auxiliary application modules, like the Redux store, should live under the `lib` directory.

#### src/app/api

The `api` directory contains server side routes for the UX. This is where you build your API calls to pull data from DeepLynx into the web application.

### Libraries

We're using libraries that enjoy widespread adoption for their breadth of components or functionality, and ability to maintain.

#### MUI

UX components come from MUI. They have good documentation and are probably the most prominent component library in the world. You can style them with JSX using their native `sx` prop.

#### TailwindCSS

Eventually we should use Tailwind to design custom styles, and insert them into our MUI components using their `sx` prop. These global styles or themes might live in the `lib` directory.

#### useSWR

This is the data fetching hook recommended by NextJS for client side data fetching.

#### useContext

Notice that a custom hook is defined in `src/app/(main)/containers/[containerID]/layout.tsx`. This hook wraps the `useContext` React hook to provide container metadata to any component that requires it. You can pull the container's metadata into a component by calling `useContainer()`.
