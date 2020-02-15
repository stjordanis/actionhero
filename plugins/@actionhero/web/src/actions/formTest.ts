import { Action } from "./../../../../../core";

export class SleepTest extends Action {
  constructor() {
    super();
    this.name = "formTest";
    this.description = "It is always OK!";
    this.inputs = {
      key: { required: true },
      value: { required: true }
    };
    this.outputExample = {
      status: "ok"
    };
  }

  async run({ response, params }) {
    response.value = params.value;
    response.key = params.key;
    response.status = "ok";
  }
}
