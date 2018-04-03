/**
 * Created by rodak on 20.05.15.
 */
import variable from "../src/variable";
import * as variableMod from '../src/variable';
import procedure, {Procedure} from "../src/procedure";
import array from '../src//array';
import * as reactive from '../src/main';
import chai = require('chai');
import {_ReactiveNode, _resetRanks} from "../src/node";
var expect = chai.expect;

reactive.logError(true);

function greaterRank(o1, o2){
    return expect(o1.$r._crank).to.gt(o2.$r._crank);
}

describe("node", function () {

    describe("execute listener", function(){
        it("should execute the listener of a node and not execute it again if its already actual", function(){
            var v = variable<number>(1);
            var r: number;
            var nr = 0;
            var p = procedure(function(){
                r = v.value + 1;
                nr++;
            });
            expect(nr).to.equal(1);
            var vv = variable(2);
            var pr = procedure(function(){
                v.value = vv.value + 1;
                p.update();
                expect(r).to.equal(vv.value + 2);
            });
            expect(nr).to.equal(2);
            expect(r).to.equal(4);
            v.value = 2;
            expect(nr).to.equal(3);
            expect(r).to.equal(3);
            vv.value = 5;
            expect(nr).to.equal(4);
            expect(r).to.equal(7);
            pr.cancel();
            procedure(function(){
                v.value = vv.value + 1;
                p.update();
                expect(r).to.equal(vv.value + 2);
                v.value = 3;
            });
            expect(r).to.equal(4);
            vv.value = 100;
            expect(r).to.equal(4);
        });

        it("if node is enqueued it should not be executed", function(){
            var v = variable(1);
            var va = variable(1);
            var vb = variableMod.fromFunction(function(){
                return va.value  + 1;
            });
            var v2 = variableMod.fromFunction(function(){
                var val =  v.value + vb.value;
                return val;
            });
            var c = 0;
            var p = procedure(function(){
                c++;
                var r = v.value;
                v2.update();
            });
            expect(c).to.equal(1);
            v.value = 45;
            expect(c).to.equal(2);
        });

    });
    
    it("dependencies should be auto removed", function () {
        var v1 = variable<number>(2);
        var arr = array([v1]);
        var changes1: string[] = [];
        var changes2: string[] = [];
        var arr2 = array<variableMod.IReactiveVariable<number>>().listener(function (a) {
            a.clear();
            for (var i = 0; i < arr.length; i++) {
                a.push(variable(arr.get(i).value + 2));
            }
            changes1.push("1");
        });
        var sum = variable(0).listener(function (l) {
            var sum = 0;
            for (var i = 0; i < arr2.length; i++) {
                sum += arr2.get(i).value;
            }
            l.value = sum;
            changes2.push("1");
        });
        changes1.length = 0;
        changes2.length = 0;
        expect(sum.value).to.equal(4);
        var v2 = variable(3);
        arr.push(v2);
        expect(changes1.length).to.equal(1);
        expect(changes2.length).to.equal(1);
        expect(sum.value).to.equal(9);
        changes1.length = 0;
        changes2.length = 0;
        arr.remove(0);
        expect(changes1.length).to.equal(1);
        expect(changes2.length).to.equal(1);
        expect(sum.value).to.equal(5);
        v1.value = 200;
        expect(sum.value).to.equal(5);
        expect(changes1.length).to.equal(1);
        expect(changes2.length).to.equal(1);
        v2.value = 200;
        expect(changes1.length).to.equal(2);
        expect(changes2.length).to.equal(2);
        expect(sum.value).to.equal(202);
    });
    it("should handle cycles", function () {
        _resetRanks();
        var s = variable(1);
        expect((<_ReactiveNode>s.$r)._crank).to.equal(0);
        var ss = variable(0).listener(function (v) {
            v.value = s.value + 1;
        });
        greaterRank(ss, s);
        expect(ss.value).to.equal(2);
        var proc = procedure(function (p) {
            var v = s.value;
            if (v < 15) {
                v = (s.value + 4);
            }
            s.value = v;
        });
        expect(s.value).to.equal(5);
        expect(ss.value).to.equal(6);
        greaterRank(s, proc);
        greaterRank(ss, s);
        
        var var2 = variable(22);
        s.$r.listener(function () {
            s.value = var2.value;
        });
        expect(s.value).to.equal(22);
        expect(ss.value).to.equal(23);
        greaterRank(s, var2);
        greaterRank(ss, s);
        greaterRank(s, proc);

    });

    it("should be triggered by it if it changes an observed value", function(){
        var s = variable(1);
        var p = procedure(function(){
            var v = s.value;
            if (v > 10)
            {
                v = 10;
            }
            s.value = v;
        });
        expect(s.value).to.equal(1);
        s.value = 4;
        expect(s.value).to.equal(4);
        s.value = 400;
        expect(s.value).to.equal(400);
        s.value = 300;
        expect(s.value).to.equal(300);
        greaterRank(s, p);
    });
    
    it("exceptions are propagated", function(){
        var v = variable(1);
        reactive.logError(false);
        var v2 = variable(1).listener(function(v2){
            if (v.value > 2){
                throw new Error("error");
            }
            v2.value = v.value;
        });
        var v3 = variable(2).listener(function(v3){
            v3.value = v2.value + 1;
        });
        expect(v3.value).to.equal(2);
        v.value = 4;
        expect(function(){
            v2.value;
        }).to.throw(Error);
        expect(function(){
            v3.value;
        }).to.throw(Error);
        v.value = 0;
        expect(v3.value).to.equal(1);
        reactive.logError(true);
    });

    it("should set dependency even when value is not changed", function(){
        var v1 = variable(2);
        var v2 = variable(2);
        var p = procedure(function(){
            v2.value = v1.value;
        });
        expect((<_ReactiveNode>v1.$r)._crank).to.be.lt((<_ReactiveNode>v2.$r)._crank);
    });
    
    it("cancel removes the set listener", function(){
        var v1 = variable(1);
        var v2 = variable(1).listener(function(v){
            v.value = v1.value + 2;
        });
        var v3 = variable(1).listener(function(v){
            v.value = v2.value + 2;
        });
        expect(v2.value).to.equal(3);
        expect(v3.value).to.equal(5);
        v2.$r.cancel();
        v1.value = 45;
        expect(v2.value).to.equal(3);
        v3.$r.cancel();
        v2.value = 5;
        expect(v3.value).to.equal(5);
    });
    
    it("nesteed reactive listeners are executed immediately", function(){
        var v1 = variable(1);
        var v2 = variable(null).listener(function(v){
            if (v1.value === 2){
                v.value = variable(2).listener(function(v){
                    v.value = v1.value + 4;
                });
                expect(v.value.value).to.equal(6);
            }            
        });
        v1.value = 2;
    });
    
    it("should automatically unobserve", function(){
        var variables = array<variableMod.IReactiveVariable<number>>();
        var toRemove = variable(2);
        variables.push(toRemove);
        variables.push(variable(1));
        var executions = 0;
        var sum = variable(0).listener(function(v){
            executions += 1;
            var s = 0;
            for (var i=0; i < variables.length; i++)
            {
                s += variables.values[i].value;
            }
            v.value = s;
        });
        expect(sum.value).to.equal(3);
        toRemove.value = 6;
        expect(sum.value).to.equal(7);
        expect(executions).to.equal(2);
        variables.remove(variables.values.indexOf(toRemove));
        expect(executions).to.equal(3);
        toRemove.value = 9;
        expect(sum.value).to.equal(1);
        expect(executions).to.equal(3);
    });

    function findArrayEl<E>(arr: E[], f: (arr: E) => boolean): E{
        for (var i = 0; i < arr.length; i++){
            if (f(arr[i])){
                return arr[i];
            }
        }
    }
    
    it("should never track children that are modified", function(){
        var variables = array<variableMod.IReactiveVariable<number>>();
        var toRemove = variable(2);
        var toNotRemove = variable(30);
        variables.push(toRemove);
        variables.push(toNotRemove);
        variables.push(variable(1));
        var p = procedure(function(){
            for (var i=0; i < variables.length; i++)
            {
                variables.values[i].value = variables.length;
            }
        });
        expect(toRemove.value).to.equal(3);
        expect(findArrayEl((<_ReactiveNode>(<Procedure> p).$r)._childToTrigger, function(el){
            return el._node === toRemove.$r;
        })).to.be.undefined;
        expect(findArrayEl((<_ReactiveNode>(<Procedure> p).$r)._childToTrigger, function(el){
            return el._node === toNotRemove.$r;
        })).to.be.undefined;
        variables.remove(variables.values.indexOf(toRemove));
        expect(toRemove.value).to.equal(3);
        expect(toNotRemove.value).to.equal(2);
        expect(findArrayEl((<_ReactiveNode>(<Procedure> p).$r)._childToTrigger, function(el){
            return el._node === toRemove.$r;
        })).to.be.undefined;
        expect(findArrayEl((<_ReactiveNode>(<Procedure> p).$r)._childToTrigger, function(el){
            return el._node === toNotRemove.$r;
        })).to.be.undefined;
    });
    
    it("should not track untracked parts", function(){
        
        var v1 = variable(1);
        var v2 = variable(2);
        var v3 = variable(0).listener(function(v){
            var sum = 0;
            sum += v1.value;
            reactive.unobserved(function(){
                sum += v2.value;
            });
            v.value = sum;
        });
        expect(v3.value).to.equal(3);
        v1.value = 2;
        expect(v3.value).to.equal(4);
        v2.value = 6;
        expect(v3.value).to.equal(4);
        v1.value = 1;
        expect(v3.value).to.equal(7);


        procedure(function(){
            reactive.unobserved(function(){
                v2.value = v1.value + 1;
            });
        });
    });

    describe("noChanges", function(){
        it("should not track changes", function(){
            var v1 = variable(1);
            var v2 = variable(2);
            var r1 = (<_ReactiveNode>v1.$r)._crank;
            var r2 = (<_ReactiveNode>v2.$r)._crank;
            if (r2 >= r1){
                var p = procedure(function(){
                    reactive.unchanged(function(){
                        v1.value = v2.value;
                    });
                });
                greaterRank(p, v2);
                expect(r1).to.eq((<_ReactiveNode>v1.$r)._crank);
            }
            else {
                var p = procedure(function(){
                    reactive.unchanged(function(){
                        v2.value = v1.value;
                    });
                });
                greaterRank(p, v1);
                expect(r1).to.eq((<_ReactiveNode>v2.$r)._crank);
            }
        });
    });

    it("should execute nodes until cycle is resolved" ,function(){
        var v1 = variable(1);
        var v2 = variable(0).listener(function(v){
            v.value = v1.value + 1;
        });
        procedure(function(){
            if (v2.value < 10)
            {
                v1.value = v2.value + 1;
            }
        });
        expect(v1.value).to.equal(9);
    });

    it("should prefer changes over observation when tracking changes", function(){
        var h = variable(6);
        var x = variable(1);
        var p = procedure(function(){
            x.value = 0;
            x.value = x.value + h.value / 2;
        });
        expect(findArrayEl((<_ReactiveNode>x.$r)._childToTrigger, function(el){
            return el._node === (<Procedure>p).$r;
        })).to.be.undefined;
        expect(findArrayEl((<_ReactiveNode>(<Procedure>p).$r)._childToTrigger, function(el){
            return el._node === x.$r;
        })).to.be.undefined;
    });

    
});
