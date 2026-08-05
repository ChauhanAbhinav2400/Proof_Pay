import { RouterProvider } from "react-router-dom";
import { router } from "./routes/router";

export function App(): JSX.Element { return <RouterProvider router={router} />; }
