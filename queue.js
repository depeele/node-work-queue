/** @file
 *
 *  A simple, syncrhonous work-queue.
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
    /** @brief  Add a task to the queue.
     *  @param  run         The function to invoke when this task is ready for
     *                      execution.  When the task completes, it MUST emit
     *                      a 'complete' event with two parameters, err, and
     *                      res:
     *                          this.emit('complete', err, res);
     *  @param  complete    If provided, this function will be invoked once
     *                      run() completes.  If this function returns false,
     *                      tasking will cease
     *                          complete(state, err, res) { return true; }
     *  @param  label   If provided, a label for this task;
     *
     *  @return this for a fluent interface;
     */
    addTask: function(run, complete, label) {
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

    /** @brief  Pop the next task and begin its execution.
     *  @param  state   The current processing state;
     *  @param  onStop  If provided, a function to invoke whenever tasking is
     *                  stopped, either due to a task.complete() callback
     *                  returning false or the queue being emptied
     *                      onStop(type, state, err, res);
     *
     *                  Where 'type' may be 'error' or 'empty'.
     *
     *  @return this for a fluent interface;
     */
    next: function(state, onStop) {
        var self    = this,
            task;

        var stop    = function(type, err, res) {
            if (onStop && (typeof onStop === 'function'))
            {
                onStop.call(self, type, state, err, res);
            }
        };

        if ( (queue.length > 0) && (task = queue.shift()) )
        {
            task.once('complete', function(err, res) {
                // If the callback returns false, terminate processing
                if (task.complete.call(task, state, err, res) === false)
                {
                    return stop('error', err, res);
                }

                // Move on to the next task
                self.next(state, onStop);
            });

            // Invoke this task
            task.run.call(task, state);
        }
        else
        {
            stop('empty');
        }

        return this;
    },

    /** @brief  Empty the current run queue;
     *
     *  @return The queue length (integer);
     */
    empty: function() {
        while (queue.pop());
    },

    /** @brief  Return the current queue length;
     *
     *  @return The queue length (integer);
     */
    queueLength: function() {
        return queue.length;
    }
};
