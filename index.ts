/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import {default as reactiveMod} from "./src/main";
import * as smod from './src/event';
import * as arrMod from './src/array';
import * as nodeMod from './src/node';
import * as proc from './src/procedure';
import {IProcedure} from './src/procedure';
import * as reactorMod from './src/reactor';
import * as vmod from './src/variable';
import {ICancellable as e_ICancellable, nullCancellable as nc} from './src/cancellable';
import optionalMod from './src/optional';
import {ICancellableIterator as e_ICancellableIterator} from './src/iterator';
import {SingleDelayProcedureExecution} from "./src/procedure/manual";


/**
 * Creates a reactive object depending on the type of the parameter.
 * If a function is given, a reactive procedure is returned.
 * If an object is given, a reactive object is returned with the given properties.
 * If an array is given, a reactive array is returned with the contents of the given array.
 * Otherwise, a reactive variable is created.
 *
 * @param val Value to transform into a reactive object
 * @returns {any} The reactive object
 */
function reactive(val: any){
    return reactiveMod(val);
}

/**
 * The reactive namesapce
 */
namespace reactive{

    export type IReactiveNode = nodeMod.IReactiveNode;

    export const node = nodeMod.default;

    /**
     * Creates a new event stream
     * @returns {IStream<any>}
     */
    export function event<E>(){
        return smod.stream<E>();
    }

    export namespace event{
        export type IStream<E> = smod.IStream<E>;
    }

    /**
     * Creates a new reactive procedure
     * @param {(p: IProcedure) => void} listener The code to execute.
     * @returns {IProcedure}
     */
    export function procedure(listener: (p: IProcedure) => void){
        return proc.procedure(listener);
    }

    export namespace procedure{

        /**
         * Creates a new reactive procedure that executes the listener some time later
         * inside an animation frame.
         * @param {(p: reactive.procedure.IProcedure) => void} updater The code to execute
         * @returns {IAnimationFrameExecution}
         */
        export function animationFrame(updater: (p: IProcedure) => void){
            return proc.executeInAnimationFrame(updater);
        }

        export namespace animationFrame{
            export const loopNr = proc.getLoopNr;
        }

        export const timeout = proc.executeDelayed;
        export const unchanged = proc.noChanges;

        /**
         * Creates a procedure that will not execute the listener itself. Execution must
         * be triggered by the user manually by calling the "update" method of the handle.
         * Note that calling "update" is a reactive observation that will trigger an observer
         * when the reactive procedure is triggered by other reactive objects.
         * @param {(p: reactive.procedure.IProcedure) => void} listener The listener for the reactive procedure
         * @returns {reactive.procedure.IManualProcedureExecution} The handle for the manual procedure.
         */
        export function manual(listener: (p: IProcedure) => void): IManualProcedureExecution{
            return new SingleDelayProcedureExecution(listener);
        }
        export type IManualProcedureExecution = proc.IManualProcedureExecution;
        export type IProcedure = proc.IProcedure;
        export type IAnimationFrameExecution = proc.IAnimationFrameExecution;
    }

    /**
     * Creates a new reactive array with the given initial elements
     * @param {E[]} initial
     * @returns {reactive.array.IReactiveArray<E>}
     */
    export function array<E>(initial?: E[]): array.IReactiveArray<E>{
        return arrMod.array(initial);
    }

    export namespace array{
        export const isReactiveArray = arrMod.isReactiveArray;
        export const getNativeArray = arrMod.getNativeArray;
        export const join = arrMod.joinArrays;
        export type IReactiveArray<E> = arrMod.IReactiveArray<E>;
        export type IReadableReactiveArray<E> = arrMod.IReadableReactiveArray<E>;
        export type ArrayUpdate<E> = arrMod.ArrayUpdate<E>;
        export type UpdateHandler<E> = arrMod.UpdateHandler<E>;
    }

    export const unobserved = reactorMod.unobserved;
    export const unchanged = reactorMod.unchanged;
    export const getReactor = reactorMod.getReactor;
    export const transaction = reactorMod.transaction;

    /**
     * Creates a new reactive variable with the given value
     * @param {E} value The initial value of the variable
     * @returns {IReactiveVariable<E>}
     */
    export function variable<E>(value: E): vmod.IReactiveVariable<E>{
        return vmod.variable<E>(value);
    }

    export namespace variable{
        export type IVariable<E> = vmod.IVariable<E>;
        export type IReactiveVariable<E> = vmod.IReactiveVariable<E>;
        export const transformProperties = vmod.transformProperties;
        export const createJustInTimeProperty = vmod.createJustInTimeProperty;
        export const defineProperty = vmod.defineProperty;
        export const fromFunction = vmod.fromFunction;
    }

    /**
     * An cancellable that will do nothing when cancel is called
     * @type {ICancellable}
     */
    export const nullCancellable = nc;

    export const optional = optionalMod;

    export type ICancellable = e_ICancellable;
    export type ICancellableIterator<E> = e_ICancellableIterator<E>;
}

export = reactive;