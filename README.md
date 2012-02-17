A simple, synchronous, FIFO work-queue.

Sometimes there are interdependent tasks that must be perform in succession
with each subsequent task dependent upon the success or failure of the
previous.  For such cases, the typical node.js callback pattern becomes
cumbersome:
    
    // establish and execute the work-queue
    run1( state, function(state, err, res) {
        if (complete(state, err, res) === false)    { return; }

        run2( state, function(state, err, res) {
            if (complete(state, err, res) === false)    { return; }
    
            run3( state, function(state, err, res) {
                if (complete(state, err, res) === false)    { return; }
    
            });
        });
    });
    
    
    // completion and work routines
    function complete(state, err, res)
    {
        // Present any error or result information
    
        return (err ? false : true);
    }
    
    function run1(state, cb)
    {
        ...
        cb(state, err, res);
    }
    
    function run2(state, cb)
    {
        ...
        cb(state, err, res);
    }
    
    function run3(state, cb)
    {
        ...
        cb(state, err, res);
    }
    

This work-queue implementation provides an answer to the nesting overload that
accompanies this typical pattern.  The above example would become:
    
    var Queue = require('work-queue.js'),
        work  = Queue.create();
    
    // establish the work-queue
    work.push(run1, complete);
    work.push(run2, complete);
    work.push(run3, complete);
    
    // begin execution
    work.run(state);
    
    
    // completion and work routines
    function complete(state, err, res)
    {
        // Present any error or result information
    
        return (err ? false : true);
    }
    
    function run1(state)
    {
        ...
        this.emit('complete', err, res);
    }
    
    function run2(state)
    {
        ...
        this.emit('complete', err, res);
    }
    
    function run3(state)
    {
        ...
        this.emit('complete', err, res);
    }
    
