import {Sandbox} from "e2b";

export const getSandboxId = async (sandboxId: string)=>{
    const sandbox = await Sandbox.connect(sandboxId);
    return sandbox;
}