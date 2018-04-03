/*
 * Copyright (c) 2018. Christoph Rodak  (https://reactivechart.com)
 */

import {IList, list} from '@reactivelib/core';
import node, {IReactiveNode} from '../node';
import procedure, {IProcedure} from '../procedure';

export class SingleDelayProcedureExecution{

    public proc: IProcedure;
    public delay = true;
    public canUpdate = false;
    public $r: IReactiveNode = node();

    constructor(handle: (p: IProcedure) => void){
        this.proc = procedure((p) => {
            if (this.delay){
                this.canUpdate = true;
                this.$r.changedDirty();
                return;
            }
            this.delay = true;
            handle(p);
        });
    }


    public update(){
        this.$r.observed();
        if (this.canUpdate){
            this.canUpdate = false;
            this.delay = false;
            this.proc.update();
        }
    }

    public cancel(){
        this.proc.cancel();
    }
}

export class DelayedProcedureExecution{

    public updates: IList<IProcedure> = list<IProcedure>();
    public $r = node();

    private add(p: IProcedure){
        this.updates.addLast(p);
        this.$r.changedDirty();
    }

    public update(){
        this.$r.observed();
        this.updates.forEach(p => {
            (<any>p)._delayed_update = true;
            p.update();
        });
        this.updates = list<IProcedure>();
    }

    public procedure(handle: (p: IProcedure) => void){
        return procedure((p: any) => {
            if (!p._delayed_update){
                this.add(p);
                return;
            }
            p._delayed_update = false;
            handle(p);
        });
    }

    public cancel(){
        this.updates = list();
    }

}