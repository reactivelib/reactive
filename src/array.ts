/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import {default as node, IReactiveNode} from "./node";
import rProc, {IProcedure} from "./procedure";
import {extend, IIterator} from "@reactivelib/core";
import {ICancellable} from "./cancellable";
import stream from './event';
import {getReactor} from "./reactor";
import {ICancellableIterator} from "./iterator";


/**
 * Handles the updates of a reactive array
 */
export interface UpdateHandler<E>{

    /**
     * Called when a new value was inserted into the reactive array
     * @param value The inserted value
     * @param index The index value was inserted at
     */
    add?(value: E, index: number): void;
    /**
     * Called when a value was removed from the reactive array
     * @param value The removed value
     * @param index The index value was removed from
     */
    remove?(value: E, index: number): void;
    /**
     * Called when a value was modified
     * @param value The new value
     * @param index The modified index position
     * @param old The value the was replaced
     */
    replace?(value: E, index: number, old: E): void;
    /**
     * Called everytime after all updates have been processed
     */
    after?(): void;

    /**
     * Called before processing all updates
     */
    before?(): void;
    /**
     * If true, will generate update events for all the elements in the reactive array.
     */
    init?: boolean;

}

export interface IReadableReactiveArray<E>{

    /**
     * The number of elements in this collection
     */
    length: number;
    /**
     * Iterator over the collection elements
     */
    iterator(): IIterator<E>;
    /**
     * Return the element at given index
     * @param indx
     */
    get(indx: number): E;
    /**
     * Adds an update handler that will be notified whenever the array is modified
     * @param handler
     * @return A cancellable that cancels the notifications
     */
    onUpdate(handler: UpdateHandler<E>): ICancellable;

    updates(): ICancellableIterator<ArrayUpdate<E>>;
    /**
     * The native array containing the elements of the IReadableReactiveArray
     */
    values: E[];
    array: E[];

    forEach(list: (e: E) => void): void;

    indexOf(el: E): number;

}


/**
 * A reactive array.
 * @param E Element type this array is holding
 */
export interface IReactiveArray<E> extends IReadableReactiveArray<E>{

    $r: IReactiveNode;
    /**
     * Inserts element at given index
     * @param indx
     * @param E
     */
    insert(indx: number, val: E): void;
    /**
     * Sets the elements at the given index. Old value will be replaced.
     * @param indx
     * @param E
     */
    set(indx: number, val: E): void;
    /**
     * Add's given element to the end of this array
     * @param value
     */
    push(value: E): void;
    /**
     * Like "onUpdate", but modifications will not call "modify". "remove" and "add" will be called instead.
     * @param handler
     */
    onUpdateSimple(handler: UpdateHandler<E>): ICancellable;
    /**
     * Removes all elements in this array
     */
    clear(): void;
    /**
     * Removes element at given index
     * @param indx
     */
    remove(indx: number): E;

    /**
     * Creates a new reactive array that contains mapped elements from this reactive array. Changes to this array
     * will be automatically remapped. In order to stop automatic remapping, you must call the "cancel" method
     * on the returned array.
     * @param {((e: E) => M) | ReactiveMapConfig<E, M>} mapper The mapper. Either a function or a {ReactiveMapConfig} object
     * @returns {IReactiveArray<M>} The array containing mapped elements
     */
    reactiveMap<M>(mapper: ((e: E) => M) | ReactiveMapConfig<E, M>): IReactiveArray<M>;

    /**
     * Sets an optional reactive listener for this reactive array.
     * @param {(array: IReactiveArray<E>) => void} l
     */
    listener(l: (array: IReactiveArray<E>) => void);

    cancel();
}

/**
 * The type of the update.
 * 
 * 
 * |type|description
 * |-|-|
 * |"ADD"|An element was added|
 * |"REMOVE"|An element was removed|
 * |"REPLACED"|An element was replaced|
 */
export type ArrayUpdateType = "ADD" | "REMOVE" | "REPLACE";

/**
 * Describe an update in an array
 */
export interface ArrayUpdate<E>{
    /**
     * The type of the update.
     */
    type: ArrayUpdateType;
    /**
     * The index at which the update happened
     */
    index: number;
    /**
     * In the case of an "ADD" or "REPLACE" event, the newly inserted value. For a "REMOVE" event, the removed value
     */
    value: E;
    /**
     * In case of a "REPLACE" event, the value that was removed.
     */
    old?: E;
}

export class ArrayChangesIterator<E>{

    public queue: ArrayUpdate<E>[] = [];
    public onCancelled = stream<any>();
    private cancelled = false;
    public $r: IReactiveNode = node();

    constructor() {

    }

    public enqueue(element: ArrayUpdate<E>) {
        this.queue.push(element);
        this.$r.changedDirty();
    }
    
    public cancel(){
        if (!this.cancelled){
            this.onCancelled.fire(null);
        }
    }

    public hasNext() {
        this.$r.observed();
        return this.queue.length > 0;
    }

    public next(): ArrayUpdate<E> {
        this.$r.observed();
        return this.queue.shift();
    }
    
    public handleUpdates(handler: UpdateHandler<E>) {
        while (this.hasNext()) {
            var el = this.next();
            if (el.type === "ADD") {
                if (handler.add)
                    handler.add(el.value, el.index);
            }
            else if (el.type === "REMOVE") {
                if (handler.remove)
                    handler.remove(el.value, el.index);
            }
            else
            {
                if (handler.replace){
                    handler.replace(el.value, el.index, el.old);
                }
            }
        }
    }
}

class ArrayIterator<E> implements IIterator<E>
{

    public index = 0;

    constructor(public array: AbstractReactiveArray<E>){

    }

    public hasNext(){
        return this.index < this.array.length;
    }

    public next(){
        var val = this.array.get(this.index);
        this.index++;
        return val;
    }
}

/**
 * Settings for reactive mappings
 */
export interface ReactiveMapConfig<E, M>{
    /**
     * The mapping functionn
     * @param {E} e value to map
     * @param {number} index index of the value to map
     * @param {M} old the old value if the value on the source array was changed, undefined otherwise
     * @returns {M} The mapped value
     */
    map(e: E, index: number, old?: M): M;

    /**
     * Called after all items have been mapped. This is recalled every time one or several updates are done
     * to the source array
     * @param {IReactiveArray<M>} arr The mapped array
     */
    after?(arr: IReactiveArray<M>): void;

    /**
     * Called when the value was removed from the source array
     * @param {M} e the value removed
     * @param {number} index the index of the removed value
     */
    remove?(e: M, index: number): void;

}

abstract class AbstractUpdater<E>{

    constructor(){

    }

    public updateListeners: ArrayChangesIterator<E>[] = [];

    public fire(u: ArrayUpdate<E>){
        for (var i=0; i < this.updateListeners.length; i++){
            this.updateListeners[i].enqueue(u);
        }
    }

    public updates(startFromEmptyArray = false) {
        var it = new ArrayChangesIterator<E>();
        this.updateListeners.push(it);
        it.onCancelled.observe(() =>
        {
            this.updateListeners.splice(this.updateListeners.indexOf(it), 1);
        });
        if (startFromEmptyArray) {
            this.fillCollectionEvents(it);
        }
        return it;
    }

    protected abstract fillCollectionEvents(it: ArrayChangesIterator<E>): void;

    public onUpdate(handler: UpdateHandler<E>) {
        var iterator = this.updates(handler.init);
        var proc: IProcedure;
        var first = true;
        var handle = function(p: IProcedure){
            if (!first){
                if (handler.before){
                    handler.before();
                }
            }
            iterator.handleUpdates(handler);
            if (!first){
                if (handler.after){
                    handler.after();
                }
            }
            first = false;
        };
        proc = rProc(function (p) {
            handle(p);
        });
        var oldCanc = proc.cancel;
        proc.cancel = function(){
            oldCanc.call(proc);
            iterator.cancel();
        };
        return proc;
    }

    public onUpdateSimple(handler: UpdateHandler<E>){
        var c = extend({
            replace: function(this: UpdateHandler<E>, el: E, indx: number, old: E){
                this.remove(old, indx);
                this.add(el, indx);
            }
        }, handler);
        return this.onUpdate(c);
    }

}

class ArrayUpdater<E> extends AbstractUpdater<E>{

    constructor(public array: IReadableReactiveArray<E>){
        super();
    }

    public fillCollectionEvents(it: ArrayChangesIterator<E>){
        var l = this.array.length;
        for (var i = 0; i < l; i++) {
            it.enqueue({type: "ADD", value: this.array.get(i), index: i});
        }
    }

}

class AbstractReactiveArray<E> implements IReadableReactiveArray<E>{

    public array: E[];
    public $r = node();
    private updater: ArrayUpdater<E> = new ArrayUpdater<E>(this);

    constructor(initial?: E[]) {
        if (initial === void 0) {
            initial = [];
        }
        var arr: E[] = [];
        initial.forEach(function (el) {
            return arr.push(el);
        });
        this.array = arr;

    }

    protected _onUpdate(u: ArrayUpdate<E>){
        this.updater.fire(u);
    }

    public updates(startFromEmptyArray = false) {
        return this.updater.updates(startFromEmptyArray);
    }

    public update(){
        this.$r.update();
    }

    public indexOf(el: E){
        this.$r.observed();
        return this.array.indexOf(el);
    }

    public forEach(f: (e: E) => void){
        this.$r.observed();
        this.array.forEach(f);
    }

    public onUpdate(handler: UpdateHandler<E>) {
        return this.updater.onUpdate(handler);
    }

    public onUpdateSimple(handler: UpdateHandler<E>){
        return this.updater.onUpdateSimple(handler);
    }

    public reactiveCopyTo(array: ReactiveArray<E>): IProcedure{
        var self = this;
        return rProc(function(){
            array.$r.changed();
            for (var i=0; i < self.size; i++)
            {
                array.set(i, self.array[i]);
            }
            var nrToRemove = array.array.length - self.size;
            for (var i=0; i < nrToRemove; i++)
            {
                array.remove(array.array.length - 1);
            }
        });
    }

    public reactiveMap<M>(mapper: ((e: E) => M) | ReactiveMapConfig<E, M>) {
        var conf: ReactiveMapConfig<E, M>;
        if (typeof mapper === "function"){
            conf = {
                map: <(e: E) => M>mapper
            }
        }
        else {
            conf = <(ReactiveMapConfig<E, M>)> <any> mapper;
        }
        conf = extend({
            remove: function(){

            },

            after: function(){

            }
        }, conf);
        var updates = this.updates(true);
        var res = new ReactiveArray<M>().listener(function (arr) {
            updates.handleUpdates({
                add: function (item:E , index: number) {
                    arr.insert(index, conf.map(item, index, null));
                },
                remove: function (item: E, index: number) {
                    var me = arr.remove(index);
                    conf.remove(me, index);
                },
                replace: function(item: E, index: number, old: E){
                    arr.set(index, conf.map(item, index, arr.array[index]));
                }
            });
            conf.after(arr);
        });
        var oldCancel = res.$r.cancel;
        res.$r.cancel = function(){
            oldCancel.call(res.$r);
            updates.cancel();
        };
        return res;
    }

    public clear() {
        var reactor = getReactor();
        reactor._startTransaction();
        try{
            if (this.updater.updateListeners.length > 0) {
                var l = this.array.length;
                for (var i = 0; i < l; i++) {
                    this._onUpdate({type: "REMOVE", value: this.array[i], index: 0});
                }
            }
            this.array.length = 0;
            this.$r.changed();
            this.$r.dirty();
        }finally{
            reactor._endTransaction();
        }
    }

    public get(index: number) {
        this.$r.observed();
        return this.array[index];
    }

    public set(index: number, value: E) {
        var reactor = getReactor();
        try{
            reactor._startTransaction();
            var upd: ArrayUpdateType = "ADD";
            var old:E = null;
            if (index < this.array.length) {
                upd = "REPLACE";
                old = this.array[index];
            }
            if (old !== value)
            {
                this._onUpdate({type: upd, value: value, index: index, old: old});
                this.array[index] = value;
                this.$r.dirty();
            }
            this.$r.changed();
        }finally
        {
            reactor._endTransaction();
        }
    }

    public fireUpdateEvent(index: number){
        if (index >= 0 && index < this.array.length){
            var old = this.array[index];
            this._onUpdate({type: "REPLACE", value: old, index: index, old: old});
            this.$r.dirty();
            this.$r.changed();
        }
    }

    public iterator(): IIterator<E> {
        return new ArrayIterator<E>(this);
    }

    public listener(listener: (a: AbstractReactiveArray<E>) => void){
        this.$r.listener(() => {
            listener(this);
        });
        return this;
    }

    public push(value: E){
        var res = this.array.push(value);
        var reactor = getReactor();
        try{
            reactor._startTransaction();
            this._onUpdate({type: "ADD", value: value, index: this.array.length - 1});
            this.$r.changed();
            this.$r.dirty();
        }finally {
            reactor._endTransaction();
        }
        return res;
    }

    get values(){
        this.$r.observed();
        return this.array;
    }

    set values(vals){
        this.clear();
        for (var i = 0; i < vals.length; i++) {
            this.set(i, vals[i]);
        }
    }

    get size(){
        this.$r.observed();
        return this.array.length;
    }

    get length(){
        this.$r.observed();
        return this.array.length;
    }
}

class ReactiveArray<E> extends AbstractReactiveArray<E> implements IReactiveArray<E>{
    constructor(initial?: E[]){
        super(initial);
    }

    cancel(){
        this.$r.cancel();
    }

    public remove(index: number) {
        var reactor = getReactor();
        if (index >= 0 && index < this.array.length) {
            try{
                reactor._startTransaction();
                var old = this.array[index];
                this.array.splice(index, 1);
                this._onUpdate({type: "REMOVE", index: index, value: old});
                this.$r.changed();
                this.$r.dirty();
                return old;
            }finally{
                reactor._endTransaction();
            }
        }
        return null;
    }

    public insert(index: number, value: E){
        var reactor = getReactor();
        try{
            reactor._startTransaction();
            this.array.splice(index, 0, value);
            this._onUpdate({type: "ADD", index: index, value: value});
            this.$r.changed();
            this.$r.dirty();
        }finally{
            reactor._endTransaction();
        }
    }

    public listener(listener: (a: ReactiveArray<E>) => void): this{
        return super.listener(listener);
    }

}

export function listener<E>(l: (arr: IReactiveArray<E>) => void) {
    return array<E>([]).listener(l);
}

export function arrays(array: IReactiveArray<any> | any[]){
    return {
        concatenate: function(){
            return listener(function (arr) {
                arr.clear();
                var l = array.length;
                var vals = getNativeArray<any>(array);
                for (var i = 0; i < l; i++) {
                    var elements = getNativeArray<any>(vals[i]);
                    var el = elements.length;
                    for (var j = 0; j < el; j++) {
                        arr.push(elements[j]);
                    }
                }
            });
        }
    }
}

/**
 * Joins the 2 reactive given reactive arrays. Changes to either array will be reflected in the resulting array.
 * In order to stop the resulting array of being updated, you must call its "cancel" method.
 * @param {IReactiveArray<E>} array1
 * @param {IReactiveArray<E>} array2
 * @returns {IReactiveArray<E> & ICancellable} The array containing the join of the 2 given arrays
 */
export function joinArrays<E>(array1: IReactiveArray<E>, array2: IReactiveArray<E>): IReactiveArray<E> & ICancellable{
    var res = array<E>([]);
    var c1 = array1.onUpdate({
        add: (el, indx) => {
            res.insert(indx, el);
        },
        remove: (el, indx) => {
            res.remove(indx);
        },
        replace: (el, indx, old) => {
            res.set(indx, el);
        },
        init: true
    });
    var c2 = array2.onUpdate({
        add: (el, indx) => {
            res.insert(indx + array1.length, el);
        },
        remove: (el, indx) => {
            res.remove(indx + array1.length);
        },
        replace: (el, indx, old) => {
            res.set(indx + array1.length, el);
        },
        init: true
    });
    (<any>res).cancel = function () {
        c1.cancel();
        c2.cancel();
        res.$r.cancel();
    }
    return <any>res;
}

/**
 *
 * @param arr
 * @returns {boolean} true if the given object is a reactive array, false otherwise
 */
export function isReactiveArray(arr: any){
    return arr instanceof ReactiveArray;
}

/**
 * If the parameter is a reactive array, returns the native array of the reactive array.
 * If the parameter is a native array, it just returns the native array.
 * @param {IReactiveArray<E> | E[]} arr
 * @returns {E[]}
 */
export function getNativeArray<E>(arr: IReactiveArray<E> | E[]): E[]{
    if (!arr){
        return null;
    }
    if (isReactiveArray(arr)){
        return (<any>arr).values;
    }
    return <E[]>arr;
}

export function array<E>(initial?: E[]): IReactiveArray<E> {
    return new ReactiveArray(initial);
}

export default array;