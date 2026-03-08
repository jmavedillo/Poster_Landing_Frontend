import { CreatePosterClient } from "../create/CreatePosterClient";
import { createPosterConfigs } from "../create/createPosterConfigs";

export default function CreatePageTwo() {
  return (
    <CreatePosterClient
      {...createPosterConfigs.create2}
      templateId="minimal-clean-v1"
    />
  );
}
