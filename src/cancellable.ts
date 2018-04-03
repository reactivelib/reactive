/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import stream from "./event";

var nullCancel = {
    cancel: function(){
        
    }
}

/**
 * An object that can be cancelled
 */
export interface ICancellable{

    /**
     * Cancel this cancellable
     */
    cancel(): void;
}

class Cancellable{

    private _onCancelled = stream<() => void>();

    /**
     * True if this cancellable is cancelled
     */
    public cancelled = false;

    /**
     *
     * @param observer will be called when this cancellable is cancelled
     */
    public onCancelled(observer: (a: any) => void){
        if (this.cancelled) {
            observer(null);
            return nullCancel;
        }
        else {
            return this._onCancelled.observe(observer);
        }
    }
    public cancel(){
        if (!this.cancelled){
            this.cancelled = true;
            this._onCancelled.fire(null);
        }
    }
}

export function cancellable(handler: () => void): ICancellable{
    var c = new Cancellable();
    c.onCancelled(handler);
    return c;
}

export function cancelIf(cancellable: any){
    if (typeof cancellable.cancel === "function"){
        cancellable.cancel();
    }
}

export var nullCancellable = <ICancellable>{
    cancelled: false,
    onCancelled: function(observer: (a: any) => void){
        return nullCancel;
    },
    cancel: function(){
        
    },
    add: function(){
        
    }
}

export var none: ICancellable = nullCancellable;