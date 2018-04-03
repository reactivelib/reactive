/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import {IOptional} from "@reactivelib/core";
import {_ReactiveNode} from "./node";

export class ReactiveOptional<E> implements IOptional<E>{

    private _value: E;
    private isPresent: boolean = false;
    public $r = new _ReactiveNode();

    get present(){
        this.$r.observed();
        return this.isPresent;
    }

    set value(v: E){
        this._value = v;
        this.isPresent = true;
        this.$r.changedDirty();
    }

    public empty(){
        if (this.isPresent){
            this.isPresent = false;
            this._value = null;
            this.$r.dirty();
        }
        this.$r.changed();
    }

    get value(){
        this.$r.observed();
        if (!this.isPresent){
            throw new Error("Optional has no value");
        }
        return this._value;
    }

}

/**
 * Creates a new reactive optional object
 * @param {E} val
 * @returns {ReactiveOptional<E>}
 */
export default function<E>(val?: E){
    var opt = new ReactiveOptional<E>();
    if (val !== void 0){
        opt.value = val;
    }
    return opt;
}