import reactive from "../index";
import chai = require('chai');
var expect = chai.expect;
import './array';
import "./event";
import "./node";
import "./procedure";
import "./reactor";
import "./variable";

describe("reactive", function(){
    it("should transform object if input is object", function(){
        var o = reactive({a: 2});
        var val;
        reactive(function(){
            val = o.a;
        });
        expect(val).to.equal(2);
        o.a = 3;
        expect(val).to.equal(3);
    });

    it("should transform array into reactive array", function(){
        var a = reactive([1, 2, 3]);
        expect(a.$r).to.not.be.undefined;
    });

    it("should transform other value into reactive variable", function(){
        var v = reactive("hello");
        expect(v.value).to.equal("hello");
    });

    it("should create a reactive procedure in case of a function", function(){
        var v = reactive("hi");
        var p = reactive(function(){
            v.value = 4;
        });
        expect(v.value).to.equal(4);
    });

});