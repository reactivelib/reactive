import * as reactive from '../src/main';
import chai = require('chai');
var expect = chai.expect;
reactive.logError(true);
import array, {ArrayChangesIterator} from '../src/array';
import * as arrayMod from '../src/array';
import variable from '../src/variable';
import {transaction as inTransaction} from '../index';
import {IIterator} from "@reactivelib/core";
import {_ReactiveNode} from "../src/node";

function arraysEqual(arr1: {}[], arr2: {}[]) {
    expect(Array.isArray(arr1)).to.equal(true);
    expect(Array.isArray(arr2)).to.equal(true);
    expect(arr1.length).to.equal(arr2.length);
    for (var i = 0; i < arr1.length; i++) {
        expect(arr1[i]).to.equal(arr2[i]);
    }
}

function toArray<E>(it: IIterator<E>){
    var res: E[] = [];
    while(it.hasNext()){
        res.push(it.next());
    }
    return res;
}

describe('array', function () {
    it("should change on insertion/deletion", function () {
        var arr = array([1, 2, 3]);
        var sum = variable(0).listener(function (v) {
            var sum = 0;
            arr.values.map(function (v) {
                sum += v;
            });
            v.value = sum;
        });
        expect(sum.value).to.equal(6);
        arr.push(4);
        expect(sum.value).to.equal(10);
        arr.remove(1);
        expect(sum.value).to.equal(8);
    });
    it('should fire events', function () {
        var arr = array([1, 2, 3]);
        var add = {index: 10, value: 10};
        var rem = {index: 10, value: 10};
        expect(arr.length).to.equal(3);
        var updates = <ArrayChangesIterator<number>>arr.updates();
        var a = function (val: number, index: number) {
            add = {
                index: index,
                value: val
            };
        };
        var r = function (val: number, index: number) {
            rem = {
                index: index,
                value: val
            };
        };
        var handler = {
            add: a,
            remove: r
        };
        arr.push(4);
        updates.handleUpdates(handler);
        expect(add.index).to.equal(3);
        expect(add.value).to.equal(4);
        arr.remove(1);
        updates.handleUpdates(handler);
        expect(rem.index).to.equal(1);
        expect(rem.value).to.equal(2);
    });
    it("concatenate arrays with correct update handling", function () {
        var arr1 = array([]);
        var arr2 = array([]);
        var arr3 = array([]);
        arr1.values = [1, 2, 3];
        arr2.values = [4, 5, 6];
        arr3.values = [7, 8, 9];
        var concats = array([]);
        concats.values = [arr1, arr2];
        var arrC = arrayMod.arrays(concats).concatenate();
        expect(Array.isArray(arrC.values)).to.equal(true);
        expect(arrC.values).to.deep.equal([1, 2, 3, 4, 5, 6]);
        concats.push(arr3);
        arraysEqual(arrC.values, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
        arr2.push(10);
        arraysEqual(arrC.values, [1, 2, 3, 4, 5, 6, 10, 7, 8, 9]);
        arr2.remove(0);
        arraysEqual(arrC.values, [1, 2, 3, 5, 6, 10, 7, 8, 9]);
    });

    it("should work with normal arrays too", function(){
        expect(arrayMod.arrays([[1], [2]]).concatenate().values).to.deep.equal([1, 2]);
    });

    describe("iterator", function(){
        it("should return an iterator over the array", function(){
            var arr = array([1,2,4]);
            expect(toArray(arr.iterator())).to.deep.equal([1,2, 4]);
        });
    });

    describe("indexOf", function(){
        it("should return the index of given element", function(){
            var arr = array([1, 2, 3]);
            expect(arr.indexOf(3)).to.equal(2);
        });
    });

    describe("forEach", function(){
        it("should iterate over all elements", function(){
            var arr = array([1, 2, 3]);
            var r:number[] = [];
            expect(arr.forEach(function(el: number){
                r.push(el);
            }));
            expect(r).to.deep.equal(arr.values);
        });
    });
    
    describe("updates", function(){
        it("should iterate over elements infinetely", function(){
           var arr = array();
           var updates = arr.updates();
           expect(updates.hasNext()).to.equal(false);
           arr.push(2);
           expect(updates.hasNext()).to.equal(true);
           expect(updates.next()).to.deep.equal({type: "ADD", value: 2, index: 0});
           expect(updates.hasNext()).to.equal(false);
           arr.push(5);
           expect(updates.hasNext()).to.equal(true);
           expect(updates.next()).to.deep.equal({type: "ADD", value: 5, index: 1});
           expect(updates.hasNext()).to.equal(false);
        });
        
        describe("handleUpdates", function(){
            it("should handle add, remove none or both", function(){
                var arr = array<number>();
                var updates = <ArrayChangesIterator<number>>arr.updates();
                arr.push(5);
                var el = 0;
                updates.handleUpdates({
                    add: function(v: number){
                        el = v;
                    }
                });
                expect(el).to.equal(5);
                arr.push(4);
                expect(el).to.equal(5);
                updates.handleUpdates({                    
                });
                arr.remove(1);
                updates.handleUpdates({
                    remove: function(v: number){
                        el = v;
                    }
                });
                expect(el).to.equal(4);
                arr.remove(0);
                updates.handleUpdates({
                    add: function(v: number){
                        el = v;
                    }
                });
                expect(el).to.equal(4);
                arr.push(3);
                updates.handleUpdates({
                    add: function(v: number){
                        el = v;
                    }
                });
                expect(el).to.equal(3);
                arr.set(0, 2);
                updates.handleUpdates({
                    add: function(v: number){
                        el = v;
                    }
                });
                expect(el).to.equal(3);

            });
        });               
                
    });
    
    describe("onUpdate", function(){
        it("should fire on updates", function(){
            var arr = array<number>();
            var add, remove;
            arr.onUpdate({
                add: function(e){
                    add = e;
                },
                remove: function(e){
                    remove = e;
                }
            });
            arr.push(4);          
            expect(add).to.equal(4);      
            arr.push(7);
            arr.remove(0);
            expect(add).to.equal(7);
            expect(remove).to.equal(4);            
        });
        
        it("should be cancellable", function(){
            var arr = array();
            var add = null;
            var c = arr.onUpdate({
                add: function(e){
                    add = e;
                }
            });
            c.cancel();
            arr.push(5);
            expect(add).to.be.null;
        });

        it("should track changes if changes is set to true", function(){
            var arr = array<number>();
            var v = variable(1);
            arr.onUpdate({
                add: function(a){
                    v.value = a;
                }
            });
            arr.push(2);
            expect(v.value).to.equal(2);
            expect((<_ReactiveNode>arr.$r)._crank).to.lt((<_ReactiveNode>v.$r)._crank);
        });

        it ("should always call after method", function(){
            var arr = array();
            var afters: number[] = [];
            arr.onUpdate({
                after: function(){
                    afters.push(1);
                }
            });
            arr.push(3);
            expect(afters.length).to.equal(1);
            arr.push(2);
            expect(afters.length).to.equal(2);
        });

    });

    describe("onUpdateSimple", function(){
        it("should forward mofify events to add and remove", function(){
            var arr = array();
            var add: number[] = [];
            var rem: number[] = [];
            arr.onUpdateSimple({
                add: function(el: number){
                    add.push(el);
                },

                remove: function(el: number){
                    rem.push(el);
                }
            });
            arr.push(1);
            arr.set(0, 2);
            expect(add).to.deep.equal([1, 2]);
            expect(rem).to.deep.equal([1]);
        });
    });

    describe("update", function(){
        it("should immediately execute listener", function(){
            var v = variable(2);
            var arr = array().listener(function(a){
                a.push(v.value);
            });
            reactive.transaction(function(){
                v.value = 4;
                expect(arr.values).to.deep.equal([2]);
                arr.update();
                expect(arr.values).to.deep.equal([2, 4]);
            });
            expect(arr.values).to.deep.equal([2, 4]);
        });
    });

    describe("remove", function(){
        it("should remove and return existing elements", function(){
            var arr = array([1 ,2, 4]);
            var removed = arr.remove(2);
            expect(removed).to.equal(4);                
            expect(arr.values).to.deep.equal([1, 2]);
        });
        it("should return null if element does not exist", function(){
            var arr = array([1 ,2, 4]);
            var res = arr.remove(45);
            expect(res).to.be.null;
        });
    });
    
});

describe("array.reactiveMap", function(){
    it("should handle updates correctly", function(){
        var arr = array([1, 2,  4]);
        var mapped = arr.reactiveMap(function(element){
            return element + "h";
        });
        var res = ["1h", "2h", "4h"];
        mapped.values.forEach(function(el: string, index: number){
            expect(el).to.equal(res[index]);
        });
        arr.remove(1);
        res = ["1h",  "4h"];
        mapped.values.forEach(function(el: string, index: number){
            expect(el).to.equal(res[index]);
        });
    });
    
    it("should handle changes", function(){
        var arr = array([1, 2, 4]);
        var mapped = arr.reactiveMap(function(element){
            return element;
        });
        expect(mapped.values).to.deep.equal([1, 2, 4]);
        arr.set(1, 24);
        expect(mapped.values).to.deep.equal([1, 24, 4]);
        arr.set(0, 24);
        expect(mapped.values).to.deep.equal([24, 24, 4]);
        arr.set(2, 24);
        expect(mapped.values).to.deep.equal([24, 24, 24]);
    });
    
    it("should handle clears", function(){
        var arr = array([1, 2, 4]);
        var mapped = arr.reactiveMap(function(element){
            return element;
        });
        arr.clear();
        expect(mapped.length).to.deep.equal(0);
    });

    it("should call after function after array was modified", function(){
        var arr = array<number>([1, 2, 4]);
        var afters: number[] = [];
        var mapped = arr.reactiveMap<number>({
            map: function (element: number, index: number) {
                return element;
            },

            after: function(array){
                afters.push(array.length);
            }
        });
        expect(afters.length).to.equal(1);
        reactive.transaction(function(){
            arr.push(2);
            arr.push(3);
        });
        expect(afters).to.deep.equal([3, 5]);
    });

    it("should be cancellable", function(){

    });var arr = array([1, 2, 4]);
    var afters: number[] = [];
    var mapped = arr.reactiveMap({
        map: function (element) {
            return element;
        },

        after: function(array){
            afters.push(array.length);
        }
    });
    expect(afters.length).to.equal(1);
    mapped.$r.cancel();
    reactive.transaction(function(){
        arr.push(2);
        arr.push(3);
    });
    expect(afters.length).to.equal(1);
    
});

describe("joinArray", function(){
    it("should join 2 arrays", function(){
        var a1 = array([1,2]);
        var a2 = array([5, 6]);
        var a = arrayMod.joinArrays(a1, a2);
        expect(a.values).to.deep.equal([1,2,5,6]);
        a1.insert(0, 0);
        expect(a.values).to.deep.equal([0, 1,2,5,6]);
        a2.insert(0, 4);
        expect(a.values).to.deep.equal([0, 1,2,4, 5,6]);
        a2.push(7);
        expect(a.values).to.deep.equal([0, 1,2,4, 5,6, 7]);
        a1.push(3);
        expect(a.values).to.deep.equal([0, 1,2, 3,4, 5,6, 7]);
        a1.remove(1);
        expect(a.values).to.deep.equal([0, 2, 3,4, 5,6, 7]);
        a2.remove(1);
        expect(a.values).to.deep.equal([0, 2, 3, 4, 6, 7]);
        a2.clear();
        expect(a.values).to.deep.equal([0, 2, 3]);
        a1.clear();
        expect(a.values).to.deep.equal([]);
        a2.push(2);
        expect(a.values).to.deep.equal([2]);
        a1.push(1);
        expect(a.values).to.deep.equal([1, 2]);
        inTransaction(() => {
            a1.push(4);
            a1.push(5);
            a2.push(4);
            a1.remove(3);
            a1.push(7);
            a2.push(10);
        });
        expect(a.values).to.deep.equal(a1.values.concat(a2.values));
    });
});