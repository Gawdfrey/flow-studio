declare module 'camunda-modeler-plugin-helpers' {
  export function registerClientExtension(plugin: any): void;
}

declare module 'camunda-modeler-plugin-helpers/react' {
  export function createElement(type: any, props?: any, ...children: any[]): any;
  export const Fragment: any;
  
  export class PureComponent<P = {}, S = {}> {
    constructor(props: P);
    props: P;
    state: S;
    setState(updater: Partial<S> | ((prevState: S) => Partial<S>)): void;
    render(): any;
  }
}