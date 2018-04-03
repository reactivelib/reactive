import chai = require('chai');
import * as reactor from '../src/reactor';
import {Reactor} from "../src/reactor";
var expect = chai.expect;

describe("reactor", function(){
    describe("onTransactionEnd", function(){
        it("should fire when transaction ends", function(){
            var f = 0;
            reactor.transaction(function(){
                (<Reactor>reactor.getReactor())._onTransactionEnd(function(){
                    f = 1;
                });
                expect(f).to.equal(0);
            });
            expect(f).to.equal(1);
        });

        it("should fire immediately outside of transaction", function(){
            var f = 0;
            (<Reactor>reactor.getReactor())._onTransactionEnd(function(){
                f = 1;
            });
            expect(f).to.equal(1);
        });

    });


    describe("inTransaction", function(){
        it("should return return value", function(){
            var ret = reactor.transaction(function(){
                return 232;
            });
            expect(ret).to.equal(232);
        });
    });

});