/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import priority, {Queue} from "./priorityQueue";
import stream, {Stream} from "./event";
import {ICancellable} from "./cancellable";
import {_ReactiveNode} from "./node";

var _activeNodeStack: _ReactiveNode[] = [];
var _activeNode: _ReactiveNode = null;


/**
 * Executes the listeners of reactive objects
 */
export interface IReactor{
    _startTransaction();
    _endTransaction();
}

/**
 * @ignore
 */
export class Reactor{

    public _nodes: Queue<_ReactiveNode> = priority<_ReactiveNode>(function(a: _ReactiveNode, b: _ReactiveNode){
        return a._rank - b._rank;
    });
    public _numberOfControlled = 0;
    public _running = false;
    public _currentRun = 0;
    public _logError = false;
    public _onEnd: (() => void)[] = [];
    public _onError: Stream<_ReactiveNode> = stream<_ReactiveNode>();
    private _logCancel: ICancellable;

    constructor(){

    }

  /* public suspend(){
        var r = new Reactor();
        r._currentRun = reactor._currentRun - 1;
        var o = reactor;
        reactor = r;
        r._nodes = this._nodes;
        r._startTransaction();
        r._endTransaction();
        reactor = o;
    }*/

    public _pushActiveNode(node: _ReactiveNode){
        _activeNodeStack.push(node);
        _activeNode = node;
    }

    public _popActiveNode() {
        _activeNodeStack.pop();
        var ei = _activeNodeStack.length - 1;
        if (ei >= 0) {
            _activeNode = _activeNodeStack[ei];
        }
        else {
            _activeNode = null;
        }
    }

    public _getActiveNode() {
        return _activeNode;
    }

    public _enqueue(node: _ReactiveNode) {
        node._enqueued = true;
        node._rank = node._crank;
        this._nodes.offer(node);
    }

    public _startTransaction() {
        this._numberOfControlled++;
    }

    public _onTransactionEnd(listener: () => void){
        if (!this._running && this._numberOfControlled == 0)
        {
            listener();
        }
        else
        {
            this._onEnd.push(listener);
        }
    }

    public _endTransaction() {
        this._numberOfControlled--;
        if (this._numberOfControlled === 0) {
            this._numberOfControlled++;
            this._currentRun++;
            var run = this._currentRun;
            this._running = true;
            try {
                var n: _ReactiveNode;
                while ((n = this._nodes.poll()) != null) {
                    n.__run(run);
                    n._enqueued = false;
                }
            }
            finally {
                this._running = false;
                this._numberOfControlled--;
                var l = this._onEnd.length;
                if (l > 0){
                    for (var i=0; i < l; i++)
                    {
                        this._onEnd[i]();
                    }
                    this._onEnd = [];
                }
            }
        }
    }

    set logError(v: boolean){
        this._logError = v;
        if (this._logError && !this._logCancel)
        {
            this._logCancel = this._onError.observe(
                /*istanbul ignore next */
                function(o: _ReactiveNode){
                    console.log(o._error);
                    console.log(o._error.stack);
                });
        }
        else if(!this._logError)
        {
            /*istanbul ignore next*/
            if (this._logCancel){
                this._logCancel.cancel();
            }
        }
    }
}

var reactor: Reactor = new Reactor();
reactor.logError = true;

/**
 *
 * @returns {IReactor} The reactor responsible to execute the listeners of reactive objects.
 */
export function getReactor(): IReactor{
    return reactor;
}

/**
 * Starts a new reactive transaction and executes the given handler function. All reactive changes
 * will be propagated only at after the handler function finishes.
 *
 * If transactions are nested, changes are propagated only when the last transaction finishes.
 * @param {() => E} handler The code to execute
 * @returns {E} The return value of the handler
 */
export function transaction<E>(handler: () => E): E{
    reactor._startTransaction();
    try {
        return handler();
    }
    finally {
        reactor._endTransaction();
    }
}

/**
 * Executes the given handler method immediately and returns its return value. All reactive objects
 * that are observed inside the handler method will not trigger the reactive object from within this is
 * executed.
 * @param {() => E} handler
 * @returns {E}
 */
export function unobserved<E>(handler: () => E){
    try {
        reactor._pushActiveNode(null);
        return handler();
    }
    finally {
        reactor._popActiveNode();
    }
}

/**
 * Executes the given handler method immediately and returns its return value. All reactive objects
 * that are changed inside the handler method will not be reordered to depend on the reactive object from within this is
 * executed.
 *
 * @param {() => void} handler
 */
export function unchanged(handler: () => void){
    var n = reactor._getActiveNode();
    try{
        if (n)
        {
            n._trackChanges = false;
        }
        handler();
    }finally{
        if (n){
            n._trackChanges = true;
        }
    }
}