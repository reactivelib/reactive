/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import node, {IReactiveNode} from "../node";
import {getReactor, unchanged as noReactorChanges, Reactor} from "../reactor";
import {cancelAnimation, requestAnimation} from "@reactivelib/core";
import {ICancellable} from "../cancellable";

/**
 * A reactive procedure is a reactive object that executes a piece of code inside a listener function.
 */
export interface IProcedure {

    /**
     * Same as {IReactiveNode} changedDirty method
     */
    changedDirty();

    /**
     * Same as {IReactiveNode} observed method
     */
    observed();


    /**
     * Same as {IReactiveNode} update method
     */
    update();

    /**
     * Cancels this reactive procedure. The listener will not be called anymore.
     */
    cancel();

}

export class Procedure implements IProcedure{

    public $r = node();
    constructor(private updater: (p: Procedure) => void){
        if (updater != null) {
            this.$r.listener(() => updater(this));
        }
        else{
            throw new Error("listener must be specified for reactive procedure");
        }
    }

    public changedDirty(){
        this.$r.changedDirty();
    }

    public observed(){
        this.$r.observed();
    }

    public update(){
        this.$r.update();
    }

    public cancel(){
        this.$r.cancel();
    }
}

/**
 * Creates a procedure that will not update reactive nodes that are changed inside the listener.
 * @param {(p: IProcedure) => void} updater The listener
 * @returns {IProcedure}
 */
export function noChanges(updater: (p: IProcedure) => void): IProcedure{
    return procedure(function(proc){
        noReactorChanges(function(){
            updater(proc);
        });
    });
}

export function listener(listener: (p: IProcedure) => void){
    return procedure(listener);
}

export function once(listener: (p: IProcedure) => void){
    var p = procedure(listener);
    var reactor =  <Reactor>getReactor();
    reactor._onTransactionEnd(function(){
        p.cancel();
    });
}

export function manuallyTriggered(listener: (p: IProcedure) => void, onTrigger: (p: IProcedure) => void){
    var trigger = false;
    var proc = procedure(function(p){
        if (!trigger){
            onTrigger(p);
            return;
        }
        listener(p);
        trigger = false;
    });
    return proc;
}

/**
 * A handle for a reactive procedure executed inside an animation frame.
 */
export interface IAnimationFrameExecution extends ICancellable{

    /**
     * Marks the reactive procedure as dirty, which will trigger a reexecution of the listener.
     * Same as calling "changedAndDirty" for a {IReactiveNode}
     */
    markChanged();

}

export var loopNr;

/**
 * Returns the i'th iteration of the currently executed procedure that is executed inside an animation frame.
 * @returns {any}
 */
export function getLoopNr(){
    return loopNr;
}

export function executeInAnimationFrame(updater: (p: IProcedure) => void): IAnimationFrameExecution{
    var update = false;
    var last: number = null;
    var pp = procedure(p => {
        noReactorChanges(() => {
            if (update){
                loopNr++;
                updater(p);
            }
            else {
                p.changedDirty();
            }
        });
    });
    var proc = noChanges(p => {
        pp.observed();
        if (update){
            proc.changedDirty();
        }
        else {
            if (last){
                cancelAnimation(last);
                last = null;
            }
            last = requestAnimation(() => {
                update = true;
                loopNr = 0;
                pp.changedDirty();
                update = false
            });
        }
    });
    return {
        cancel: () => {
            proc.cancel();
            pp.cancel();
        },
        markChanged: () => {
            pp.changedDirty();
        }
    };
    
}

/**
 * Creates a reactive procedure that will run the listener not immediately but with a delay.
 * @param {(p: IProcedure) => void} updater The listener of the reactive procedure.
 * @param {number} delay Nr of miliseconds to wait before executing the listener
 * @returns {IProcedure}
 */
export function executeDelayed(updater: (p: IProcedure) => void, delay = 100): IProcedure{
    var update = false;
    var last: any = null;
    var proc = procedure(p => {
        if (update){
            updater(p);
            update = false;
        }
        else {
            if (last){
                clearTimeout(last);
                last = null;
            }
            last = setTimeout(() => {update = true; proc.update()}, delay);
        }
    });
    return proc;
}

/**
 * Controls a manually executed reactive procedure
 */
export interface IManualProcedureExecution{
    $r: IReactiveNode;

    /**
     * Call this in order to tell the reactive procedure to execute it's reactive listener. The listener
     * will only be executed if any reactive objects it is observing has changed. Otherwise, nothing will happen.
     * This method itself is reactive and will trigger other observers when any reactive objects the reactive procedure
     * depends on change.
     */
    update();

    /**
     * Cancels the underlying reactive procedure
     */
    cancel();
}

/**
 * Creates a new reactive procedure with the given listener
 * @param {(p: IProcedure) => void} updater
 * @returns {IProcedure}
 */
export function procedure(updater: (p: IProcedure) => void): IProcedure{
    return new Procedure(updater);
}

export default procedure;