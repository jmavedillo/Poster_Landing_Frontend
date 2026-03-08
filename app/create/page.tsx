import { CreatePosterClient } from "./CreatePosterClient";
import { createPosterConfigs } from "./createPosterConfigs";

export default function CreatePage() {
  return <CreatePosterClient {...createPosterConfigs.create1} />;
}
