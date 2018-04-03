/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import {ICancellable} from "./cancellable";
import {getReactor, Reactor} from "./reactor";

export interface INodeAndRun
{
    _node: _ReactiveNode;
    _run: number;
    _version: number;
}

function _createNodeAndRun(node: _ReactiveNode, run: number, version: number): INodeAndRun{
    return <INodeAndRun>{
        _node: node,
        _run: run,
        _version: version
    }
}

var _ranks = 1;
var _mranks = -1;

export function _resetRanks(){
    _ranks = 1;
    _mranks = -1;
}

/**
 * A reactive node is an object that can observe and be observed by other reactive nodes. Nodes are executed
 * by a "reactor" in topologically sorted order based on their dependencies.
 */
export interface IReactiveNode extends ICancellable{

    /**
     * Calling this method will cause the active reactive node inside a reactive transaction to depend on this node.
     *
     */
    observed();

    /**
     * Calling this method will cause this node to depend on the currently active node inside a reactive transaction.
     */
    changed();

    /**
     * Tells this node that its state has changed.
     */
    dirty();

    /**
     * Shorthand for calling changed and then dirty methods.
     */
    changedDirty();

    /**
     * Sets a listener that will be called whenever this nodes state changes.
     * @param {() => void} list
     */
    listener(list: () => void);

    /**
     * Forces this node to be executed by the reactor immediately, suspending the currently active node if available.
     */
    update();

}

/**
 * 
 * Reactive node
 * 
 * @ignore
 * 
 */
export class _ReactiveNode implements ICancellable, IReactiveNode{


    public _meta: any;
    public _crank: number;
    public _rank: number;
    public _version: number;
    public _run: number;
    public _childToTrigger: INodeAndRun[] = [];
    public _activated: boolean;
    public _dirty: boolean;
    public __changed: boolean;
    public _error: Error;
    public _trackChanges: boolean;
    public _depsChangedListener: () => void;
    public _enqueued: boolean;
    public _cleanCheckNr: number;
    
    constructor(){
    }

    public observed() {
        var reactor = <Reactor>getReactor();
        var n = reactor._getActiveNode();
        if (n != null && n !== this) {
            n._toObserved.push(this);
        }
        if (this._error) {
            throw this._error;
        }
    }

    public changed(){
        var reactor =  <Reactor>getReactor();
        var n = reactor._getActiveNode();
        if (n != null && n._trackChanges) {
            n._toDirty.push(this);
        }
    }

    public dirty(){
        this._version++;
        this._dirty = true;
        this._enqueueNode();
    }

    public changedDirty(){
        this.changed();
        this.dirty();
    }

    public listener(list: () => void){
        this._depsChangedListener = list;
        this.update();
    }

    public update(){
        var reactor =  <Reactor>getReactor();
        this._activated = true;
        if (!reactor._running) {
            this._enqueued = true;
            reactor._startTransaction();
            try {
                reactor._currentRun++;
                this.__run(reactor._currentRun);
            }
            finally {
                this._enqueued = false;
                reactor._endTransaction();
            }
        }
        else {
            this.__run(reactor._currentRun);
        }
        
    }
    
    public _fire(){
        var childToTrigger = this._childToTrigger;
        var remain = [];
        for (var s =0; s < childToTrigger.length; s++) {
            var run = childToTrigger[s];
            if (run._node._run == run._run && run._node._depsChangedListener) {
                if (run._version < this._version) {
                    //run._version = this._version;
                    run._node._enqueueNode();
                }
                else if (run._version === this._version){
                    remain.push(run);
                }
            }
            /*
            else {
                var lr = childToTrigger[childToTrigger.length - 1];
                childToTrigger[s] = lr;
                childToTrigger.length -= 1;
                s--;
            }
            */
        }
        this._childToTrigger = remain;
    }

    public _cleanChildren(){
        var childToTrigger = this._childToTrigger;
        for (var s =0; s < childToTrigger.length; s++) {
            var run = childToTrigger[s];
            if (run._node._run !== run._run || !run._node._depsChangedListener) {
                var lr = childToTrigger[childToTrigger.length - 1];
                childToTrigger[s] = lr;
                childToTrigger.length -= 1;
                s--;
            }
        }
    }

    public _addChild(r: _ReactiveNode){
        var reactive = r;
        if (this != reactive) {
            /*var found = false;
            var nodeRun;
            for (var i=0; i < this._childToTrigger.length; i++){
                nodeRun = this._childToTrigger[i];
                if (nodeRun._node === reactive){
                    found = true;
                    break;
                }
            }

            if (!found) {*/
                var nodeRun = _createNodeAndRun(reactive, reactive._run, this._version);
                this._childToTrigger.push(nodeRun);
                if (this._childToTrigger.length > this._cleanCheckNr){
                    this._cleanChildren();
                    this._cleanCheckNr = Math.max(10, this._childToTrigger.length * 2);
                }
           /* }
            else {
                nodeRun._run = reactive._run;
                nodeRun._version = this._version;
            }*/
        }
    }

    public __run(run: number){
        if (!this._activated)
        {
            return;
        }
        this._run = run;
        this._updateReactive();
        if (this._dirty) {
            this._fire();
            this._dirty = false;
        }
        else {
            this._cleanChildren();
        }
        this._activated = false;
    }

    public _toObserved: _ReactiveNode[];
    public _toDirty: _ReactiveNode[];

    public _updateReactive(){
        if (this._depsChangedListener){
            var reactor =  <Reactor>getReactor();
            reactor._pushActiveNode(this);
            try {
                this._error = null;
                this._toObserved = [];
                this._toDirty = [];
                this._depsChangedListener();
            }
            catch (error) {
                this._error = error;
                reactor._onError.fire(this);
                this._dirty = true;
                this._version++;
            }finally{
                for (var i=0; i < this._toDirty.length; i++){
                    var n = this._toDirty[i];
                    n.__changed = true;
                }
                for (var i=0; i < this._toObserved.length; i++) {
                    var ch = this._toObserved[i];
                    if (!ch.__changed) {
                        ch._addChild(this);
                        if (this._crank <= ch._crank) {
                            if (this._crank === 0) {
                                if (ch._crank === 0) {
                                    this._crank = _ranks;
                                    _ranks++;
                                    ch._crank = _mranks;
                                    _mranks--;
                                }
                                else {
                                    this._crank = _ranks;
                                    _ranks++;
                                }
                            }
                            else {
                                if (ch._crank === 0) {
                                    ch._crank = _mranks;
                                    _mranks--;
                                }
                                else {
                                    var c = this._crank;
                                    this._crank = ch._crank;
                                    ch._crank = c;
                                }
                            }
                        }
                    }
                }

                for (var i=0; i < this._toDirty.length; i++){
                    var n = this._toDirty[i];
                    if (n !== this)
                    {
                        if (n._crank <= this._crank){
                            if (n._crank === 0){
                                if (this._crank === 0){
                                    n._crank = _ranks;
                                    _ranks++;
                                    this._crank = _mranks;
                                    _mranks--;
                                }
                                else
                                {
                                    n._crank = _ranks;
                                    _ranks++;
                                }
                            }
                            else
                            {
                                if (this._crank === 0){
                                    this._crank = _mranks;
                                    _mranks--;
                                }
                                else
                                {
                                    var c = this._crank;
                                    this._crank = n._crank;
                                    n._crank = c;
                                }
                            }
                        }
                    }
                    n.__changed = false;
                }
                this._toObserved = [];
                this._toDirty = [];
                reactor._popActiveNode();
            }
        }
    }

    public _enqueueNode(){
        if (!this._enqueued)
        {
            var reactor =  <Reactor>getReactor();
            var self = this;
            this._activated = true;
            reactor._startTransaction();
            try {
                reactor._enqueue(self);
            }
            finally {
                reactor._endTransaction();
            }
        }
    }

    public suspend(){

    }

    public resume(){

    }

    public cancel(){
        delete this._depsChangedListener;
    }

}

_ReactiveNode.prototype._crank = 0;
_ReactiveNode.prototype._version = 0;
_ReactiveNode.prototype._run = 0;
_ReactiveNode.prototype._activated = false;
_ReactiveNode.prototype.__changed = false;
_ReactiveNode.prototype._enqueued = false;
_ReactiveNode.prototype._cleanCheckNr = 10;
_ReactiveNode.prototype._trackChanges = true;

/**
 * Creates and returns a new reactive ndoe
 * @returns {IReactiveNode}
 */
export default function(): IReactiveNode{
    return new _ReactiveNode();
}