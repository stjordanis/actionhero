import { Action } from "./../../../../../core";

export class SleepTest extends Action {
  constructor() {
    super();
    this.name = "simpleStatus";
    this.description = "It is always OK!";
    this.inputs = {};
    this.outputExample = {
      status: "ok"
    };
  }

  async run({ response }) {
    response.status = "ok";
  }
}
