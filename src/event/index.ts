/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import {IList, list} from "@reactivelib/core";

/**
 * An event stream firing events of type E
 */
export interface IStream<E> {

    /**
     * The observers listening to this event stream
     */
    observers: IList<(e: E) => void>;

    /**
     *
     * @param {(e: E) => void} observer Observes the events this stream fires
     */
    observe(observer: (e: E) => void);

    /**
     * Removes given observer
     * @param {(e: E) => void} observer
     */
    unobserve(observer: (e: E) => void);

    /**
     * Fires the given event. All currently registered observers will receive the event.
     * @param {E} event
     */
    fire(event: E);

}

export class Stream<E>{

    public observers: IList<(e: E) => void> = list<(e: E) => void>();

    constructor() {

    }
    public observe(observer: (e: E) => void){
        if (!this.observers.contains(observer))
        {
            this.observers.addLast(observer);
        }
        return {
            cancel: () => {
                this.unobserve(observer);
            }
        }
    }

    public unobserve(observer: (e: E) => void){
        this.observers.findAndRemove(observer);
    }

    public fire(event: E){
        this.observers.forEach(function(observer){
            observer(event);
        })
    }

};

export function stream<E>(): IStream<E>{
    return new Stream<E>();
}

export default stream;