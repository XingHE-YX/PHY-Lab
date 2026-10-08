import "./ui/styles/global.css";
import "./ui/components/button";
import "./pages/workbench";
import "./pages/experiment-page";
import "./ui/layouts/workbench-shell";
import { offline } from "./services/offline";
void offline.start();
