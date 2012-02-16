var queue   = require('./queue.js');

// Establish the tasks to execute
queue.addTask(one,  complete);
queue.addTask(one,  complete);
queue.addTask(one,  complete);

// Begin execution
queue.next({level: 0}, fullCompletion);

/*****************************************************************************
 * Task definitions.
 *
 */

function fullCompletion(type, state, err, res)
{
    console.log('===============================');
    console.log("fullCompletion: type[ %s ], state[ %j ], err[ %j ], res[ %j ]",
                type, state, err, res);

    var len = this.queueLength();
    console.log("%d tasks in queue", len);

    if (len > 0)
    {
        // Start it up again
        queue.next(state, fullCompletion);
    }
}

/** @brief  A shared-task completion routine.
 *  @param  state   Task state;
 *  @param  err     If NOT null, and error;
 *  @param  res     Any other result data;
 *
 *  @return false to terminate tasking;
 */
function complete(state, err, res)
{
    console.log('complete: tid#%d, label[ %s ], '
                +   'state[ %j ], res[ %j ]',
                this.tid, this.label,
                state, res);
    if (err)
    {
        console.log('**** ERROR: %j', err);
    }

    return (err ? false : true);
}

/** @brief  A task run routine.
 *  @param  state   The processing state;
 *
 *  'this' is the currently running task.  Upon completion, this routine MUST
 *  emit a 'complete' event:
 *      this.emit('complete', err, res);
 */
function one(state)
{
    var self    = this;

    console.log('%s: state[ %j ]', self.label, state);

    var cos     = Math.round(100 - (Math.random() * state.level * 20)) / 100,
        pause   = Math.round(Math.random() * 4);

    state.res = (state.res ? state.res + 1 : 1);

    function wait()
    {
        console.log("%s: wait (%d)...", self.label, pause);
        state.level++;
        if (--pause <= 0)
        {
            // continue on...
            return self.emit('complete',
                             (Math.random() >= cos
                                ? {error: 'random error'}
                                : null),
                              state.res);
        }

        setTimeout(wait, 100);
    }

    wait();
}
