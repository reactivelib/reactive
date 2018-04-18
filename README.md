This is a change propagation library using ideas from the paper
[Deprecating the Observer Pattern](https://infoscience.epfl.ch/record/176887/files/DeprecatingObservers2012.pdf) 
and [scala.rx](https://github.com/lihaoyi/scala.rx). 
It executes code glitch-free, 
has automatic listener registration/de-registration and is scalable.

Here's how you would implement the first example of [scala.rx](https://github.com/lihaoyi/scala.rx) in this library:  

```javascript

var reactive = require("@reactivelib/reactive");

var a = reactive.variable(1);
var b = reactive(2); //Shortform for reactive.variable(2) 
var c = reactive(1).listener(function(v){
    v.value = a.value + b.value;
});

console.log(c.value) // prints 3;
a.value = 4;
console.log(c.value) // prints 6

```

Variables can be defined as "standalone", like variables a and b, or to depend on some calculation,
like variable c. Calculations are run inside a "reactive listener" that will be rerun everytime
one or more observed values are changed. So, after changing the value of a to 4, the listener function will be rerun and c will contain the new value 6.

Let's look at something more complex example were glitch freedom plays a role:

```javascript

var reactive = require("@reactivelib/reactive");

var list = reactive.variable([3, 4, 5]);
var average = reactive.variable(0).listener(function(v){
    v.value = list.value.reduce(function(acc, val){
        return acc+val;
    }) / list.value.length;
});
reactive.procedure(function(){
    console.log("Average of "+JSON.stringify(list.value)+" is "+average.value);    
});

// Average of [3, 4, 5] is 6


list.value = [1,2,3];

// Average of [1,2,3] is 3

```

Here, when we change the value of the list variable, the average listener gets executed 
before the listener that prints the message to the console. If the listener printing the
message was executed first, following would happen:

- message printed: Average of [1,2,3] is 6 (obviously wrong)
- average listener gets exececuted
- message printed: Average of [1,2,3] if 3 (now is correct)

The first execution of the listener is what the paper [Deprecating the Observer Pattern](https://infoscience.epfl.ch/record/176887/files/DeprecatingObservers2012.pdf) 
calls "glitch". Glitches happen because the order in which listeners are executed is wrong. This library executes
listeners in an topologically sorted order based on their dependencies. Therefore, it will
execute the above example always glitch-free. 

This is basically all this library does: Propagate changes that are caused by changing dependencies in a glitch-free manner.

#Installation

```bash
npm install @reactivelib/reactive
```

## commonjs

```javascript
var reactive = require("@reactivelib/reactive");
var a = reactive.variable(1);
```

## Browser
We provide a browser ready file "dist/reactivelib.min.js" in the npm package that exposes the global "reactivelib" and includes this package as "reactive" namespace.
This is how you can use this package using [jsdelivr](http://www.jsdelivr.com):  

```html
<head>
    <script type="text/javascript" src="https://cdn.jsdelivr.net/npm/@reactivelib/reactive@latest/dist/reactivelib.min.js"></script>
</head>

<body>

    <script type="text/javascript">   
        var reactive = reactivelib.reactive;
        var rvar = reactive.variable(0);
    </script>
</body>
```

## Typescript

```typescript
import * as reactive from '@reactivelib/reactive';
var a = reactive.variable(1);
```

### Typescript with "esModuleInterop"

When using "esModuleInterop" option, you can also import as follows:

```typescript
import reactive from '@reactivelib/reactive';
var a = reactive.variable(1);
```

or

```typescript
import {variable} from '@reactivelib/reactive';
var a = variable(1);
```


# Reactive Objects
## Node

Each reactive object uses a reactive node in order to determine when its listener method should be updated. A reactive node
has following interface:

```typescript
/**
 * A reactive node is an object that can observe and be observed by other reactive nodes. Nodes are executed
 * by a "reactor" in topologically sorted order based on their dependencies.
 */
export interface IReactiveNode extends ICancellable{

    /**
     * Calling this method will cause the active reactive node inside a reactive transaction to depend on this node.
     *
     */
    observed();

    /**
     * Calling this method will cause this node to depend on the currently active node inside a reactive transaction.
     */
    changed();

    /**
     * Tells this node that its state has changed.
     */
    dirty();

    /**
     * Shorthand for calling changed and then dirty methods.
     */
    changedDirty();

    /**
     * Sets a listener that will be called whenever this nodes state changes.
     * @param {() => void} list
     */
    listener(list: () => void);

    /**
     * Forces this node to be executed by the reactor immediately, suspending the currently active node if available.
     */
    update();

}

```
## Variable
Variables hold a value and can be observed inside a reactive listener. A variable can be created as follows:
```javascript

var reactive = require("@reactivelib/reactive");

var a = reactive.variable(1);

```

You can also add a listener method to a variable in order to make its value dependent on other reactive objects:


```javascript

var reactive = require("@reactivelib/reactive");

var a = reactive.variable(1);
var array = reactive.array([2,3,4]);

var b = reactive.variable(null).listener(function(variable){
    //Set the new value of the variable
    variable.value = array.values.reduce((prev, current) => prev + current, 0) + a.value;
})

console.log(b.value) // prints 10 

array.push(5);

console.log(b.value) // prints 15

```

### Using variables to create reactive object properties
Normally, variables are not used directly, but used to define properties of objects that should be reactive:

```javascript
var reactive = require("@reactivelib/reactive");

function createPerson({name="", email=""}){
    var rname = reactive.variable(name);
    var remail = reactive.variable(email);
    return {
        get name(){
            return rname.value;
        },
        set name(v){
            rname.value = v;
        },
        get email(){
            return remail.value;
        },
        set email(v){
            remail.value = v;
        }
    }
}

function logEmailChanges(person){
    var lastEmail = person.email;
    reactive.procedure(p => {
        if (lastEmail !== p.email){
            console.log("Email of "+person.name+" changed to "+p.email);
            lastEmail = p.email;
        }  
    });
}

var anna = createPerson({name: "Anna", email: "anna@gmail.com"});

logEmailChanges(person);

anna.email = "anna2@gmail.com" //Console will print "Email of Anna changed to anna2@gmail.com


```

## Procedure
A procedure is just a function that will be executed whenever 1 or more values that have been read change:

```javascript
const reactive = require("@reactivelib/reactive");
const v1 = reactive.variable(1);
const v2 = reactive.variable(2);

function printSum(){
    console.log(v1.value+v2.value);
}

procedure(printSum); // Prints 3

v1.value = 4; // Prints 6
```

## Array

An Array is a collection of values, backed by a native javascript array, that can be observed inside a reactive listener:

```javascript

const reactive = require("@reactivelib/reactive");

var rarr = reactive.array([1,2,3]);

var sum = reactive.variable(null).listener(v => {
    v.value = rarr.values.reduce((prev, current) => prev + current, 0);
});

console.log(sum.value) // prints 6

rarr.push(5) 

console.log(sum.value) // prints 11

```

You can also observe incremental changes:

```javascript
const reactive = require("@reactivelib/reactive");

var rarr = reactive.array([1,2,3]);
var cancellation = rarr.onUpdate({
    add: function(value, index){
        console.log("added "+value+" at index "+index);
    },
    remove: function(value, index){
        console.log("removed "+value+" at index "+index);
    },
    modify: function(value, index, oldValue){
        console.log("replaced "+oldValue+" with "+value+" at index "+index);        
    }
});


rarr.push(4); // Prints "added 4 at index 3"
rarr.remove(2) // Prints "remove 3 at index 2"
rarr.set(0, 2) // Prints "replaced 1 at with 2 index 0"

cancellation.cancel();

rarr.push(3) // Nothing is printed

```

Also checkout interface "IReactiveArray" in the source code for all reactive array methods.

#Reactive transaction
A reactive transaction delays change propagation until the transaction is finished, and then propagates all changes "at the same time". E. g.:

```javascript

const reactive = require("@reactivelib/reactive");

var rarr = reactive.array([1,1,1]);

var sum = reactive.variable(null).listener(v => {
    v.value = rarr.values.reduce((prev, current) => prev + current, 0);
});

reactive.procedure(function(){
    console.log("Sum is: "+v.value);
});
// console prints "Sum is 3"

reactive.inTransaction(() => {
    sum.push(1);
    sum.remove(0);
    sum.push(1);
});

// console prints "Sum is 5"

``` 

# Projects using this module

[ReactiveChart](https://reactivechart.com)


# API

https://reactivechart.com/public/api/reactive/index.html