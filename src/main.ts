/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import {getReactor, Reactor} from "./reactor";
import variable, {IReactiveVariable, transformProperties} from "./variable";
import procedure, {IProcedure} from "./procedure";
import array, {IReactiveArray} from "./array";

export {transaction, unchanged, unobserved} from './reactor';

export default function<E>(o: any): IReactiveArray<any> | IReactiveVariable<any> | IProcedure | any{
    if (Array.isArray(o)){
        return array<E>(o);
    }
    else if (o && typeof o === "object"){
        return transformProperties(o);
    }
    else if (typeof o === "function"){
        return procedure(o);
    }
    else
    {
        return variable<E>(o);
    }
}

export function logError(l: boolean){
    (<Reactor>getReactor()).logError = l;
}