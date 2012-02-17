/** @file
 *
 *  A simple, synchronous, FIFO work-queue.
 *
 */
var util    = require('util'),
    events  = require('events'),
    queue   = [],
    tid     = 0;

function Task(run, complete, label)
{
    events.EventEmitter.call(this);

    this.tid      = ++tid;
    this.label    = (label ? label : 'task #'+ this.tid);
    this.run      = run;
    this.complete = complete;

    return this;
}
util.inherits(Task, events.EventEmitter);


module.exports = {
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
    push: function(run, complete, label) {
        if ( typeof run !== 'function' )
        {
            throw new Error("A task must have an 'run' function");
        }

        complete = (complete && (typeof complete === 'function')
                        ? complete
                        : function(state, err, res) { return true; });


        queue.push( new Task(run, complete, label) );

        return this;
    },

    /** @brief  Removes the task from the end of the work-queue.
     *
     *  @return the task from the end of the work-queue.
     */
    pop: function() {
        return queue.pop();
    },

    /** @brief  Removes the task from the beginning of the work-queue.
     *
     *  @return the task from the end of the work-queue.
     */
    shift: function() {
        return queue.shift();
    },

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
    run: function(state, onStop) {
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
    },

    /** @brief  Empty the work-queue;
     *
     *  @return this for a fluent interface;
     */
    empty: function() {
        while (queue.pop());

        return this;
    },

    /** @brief  Return the length of the work-queue;
     *
     *  @return The length of the work-queue;
     */
    length: function() {
        return queue.length;
    }
};
