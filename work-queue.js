/** @file
 *
 *  A simple, synchronous, FIFO work-queue.
 *
 *  Sometimes there are interdependent tasks that must be perform in succession
 *  with each subsequent task dependent upon the success or failure of the
 *  previous.  For such cases, the typical node.js callback pattern becomes
 *  cumbersome:
 *      // establish and execute the work-queue
 *      run1( state, function(state, err, res) {
 *          if (complete(state, err, res) === false)    { return; }
 *
 *          run2( state, function(state, err, res) {
 *              if (complete(state, err, res) === false)    { return; }
 *
 *              run3( state, function(state, err, res) {
 *                  if (complete(state, err, res) === false)    { return; }
 *
 *              });
 *          });
 *      });
 *
 *
 *      // completion and work routines
 *      function complete(state, err, res)
 *      {
 *          // Present any error or result information
 *
 *          return (err ? false : true);
 *      }
 *
 *      function run1(state, cb)
 *      {
 *          ...
 *          cb(state, err, res);
 *      }
 *
 *      function run2(state, cb)
 *      {
 *          ...
 *          cb(state, err, res);
 *      }
 *
 *      function run3(state, cb)
 *      {
 *          ...
 *          cb(state, err, res);
 *      }
 *
 *
 *  This implementation provides an answer to the nesting overload that
 *  accompanies this typical pattern.  The above example would become:
 *
 *      var Queue = require('work-queue.js'),
 *          work  = Queue.create();
 *
 *      // establish the work-queue
 *      work.push(run1, complete);
 *      work.push(run2, complete);
 *      work.push(run3, complete);
 *
 *      // begin execution
 *      work.run(state);
 *
 *
 *      // completion and work routines
 *      function complete(state, err, res)
 *      {
 *          // Present any error or result information
 *
 *          return (err ? false : true);
 *      }
 *
 *      function run1(state)
 *      {
 *          ...
 *          this.emit('complete', err, res);
 *      }
 *
 *      function run2(state)
 *      {
 *          ...
 *          this.emit('complete', err, res);
 *      }
 *
 *      function run3(state)
 *      {
 *          ...
 *          this.emit('complete', err, res);
 *      }
 *
 */
var util    = require('util'),
    events  = require('events');

/** @brief  A single task within a work-queue.
 *  @param  queue       The containing work-queue;
 *  @param  run         The function to invoke when this task is ready for
 *                      execution.  When the task completes, it MUST emit
 *                      a 'complete' event:
 *                          this.emit('complete', err, res);
 *
 *                          If 'err' is non-null, it indicates an error
 *                          while 'res' provides any run results.
 *  @param  complete    If provided, this function will be invoked once
 *                      run() completes.  If this function returns false,
 *                      tasking will cease
 *                          complete(state, err, res) { return true; }
 *  @param  label   If provided, a label for this task;
 *
 *  Emits:
 *      'complete'  with 'err' and 'res'.  If 'err' is non-null, it indicates
 *                  an error while 'res' provides any run results.
 *
 *  @return this for a fluent interface;
 */
function Task(queue, run, complete, label)
{
    events.EventEmitter.call(this);

    this.queue    = queue;
    this.tid      = ++(queue.tid);
    this.label    = (label ? label : 'task #'+ this.tid);
    this.run      = run;
    this.complete = complete;

    return this;
}
util.inherits(Task, events.EventEmitter);

/** @brief  A work-queue.
 */
function Queue()
{
    this.queue = [];
    this.tid   = 0;

    return this;
}

/** @brief  Add a task to the end of the work-queue.
 *  @param  run         The function to invoke when this task is ready for
 *                      execution.  When the task completes, it MUST emit
 *                      a 'complete' event:
 *                          this.emit('complete', err, res);
 *
 *                          If 'err' is non-null, it indicates an error
 *                          while 'res' provides any run results.
 *  @param  complete    If provided, this function will be invoked once
 *                      run() completes.  If this function returns false,
 *                      tasking will cease
 *                          complete(state, err, res) { return true; }
 *  @param  label   If provided, a label for this task;
 *
 *  @return this for a fluent interface;
 */
Queue.prototype.push = function(run, complete, label) {
    if ( typeof run !== 'function' )
    {
        throw new Error("A task must have an 'run' function");
    }

    complete = (complete && (typeof complete === 'function')
                    ? complete
                    : function(state, err, res) { return true; });


    this.queue.push( new Task(this, run, complete, label) );

    return this;
};

/** @brief  Removes the task from the end of the work-queue.
 *
 *  @return the task from the end of the work-queue.
 */
Queue.prototype.pop = function() {
    return this.queue.pop();
};

/** @brief  Removes the task from the beginning of the work-queue.
 *
 *  @return the task from the end of the work-queue.
 */
Queue.prototype.shift = function() {
    return this.queue.shift();
};

/** @brief  Remove the task from the beginning of the work-queue and
 *          begin its execution.
 *  @param  state   The processing state;
 *  @param  onStop  If provided, a function to invoke whenever tasking is
 *                  stopped, whether due to a task.complete() callback
 *                  returning false or the queue being emptied:
 *                      onStop(type, state, err, res);
 *
 *                      'type' may be 'stopped' or 'emptied'.
 *
 *  @return this for a fluent interface;
 */
Queue.prototype.run = function(state, onStop) {
    var self    = this,
        stop    = function(type, err, res) {
            if (onStop && (typeof onStop === 'function'))
            {
                onStop.call(self, type, state, err, res);
            }
        },
        task;

    if ( (task = self.shift()) )
    {
        task.once('complete', function(err, res) {
            if (task.complete.call(task, state, err, res) === false)
            {
                // Stop tasking
                return stop('stopped', err, res);
            }

            // Continue with the next task
            self.run(state, onStop);
        });

        // Invoke this task
        task.run.call(task, state);
    }
    else
    {
        stop('emptied');
    }

    return self;
};

/** @brief  Empty the work-queue;
 *
 *  @return this for a fluent interface;
 */
Queue.prototype.empty = function() {
    while (this.queue.pop());

    return this;
};

/** @brief  Return the length of the work-queue;
 *
 *  @return The length of the work-queue;
 */
Queue.prototype.length = function() {
    return this.queue.length;
};


module.exports = {
    /** @brief  Create a new work-queue. */
    create: function() {
        return new Queue();
    }
};
