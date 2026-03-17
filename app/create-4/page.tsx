import { CreatePosterClient } from "../create/CreatePosterClient";
import { createPosterConfigs } from "../create/createPosterConfigs";

export default function CreatePageFour() {
  return <CreatePosterClient {...createPosterConfigs.create4} />;
}
