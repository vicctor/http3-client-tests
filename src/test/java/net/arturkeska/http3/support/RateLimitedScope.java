package net.arturkeska.http3.support;

import java.util.concurrent.Callable;
import java.util.concurrent.Semaphore;
import java.util.concurrent.StructuredTaskScope;

public class RateLimitedScope<T> extends StructuredTaskScope<T> {

    private final Semaphore pool;

    public RateLimitedScope(int limit) {
        pool = new Semaphore(limit);
    }

    @Override
    protected void handleComplete(Subtask<? extends T> subtask) {
        pool.release();
        // System.out.println("RELEASE: " + subtask + " on " + Thread.currentThread().getName());
    }

    @Override
    public <U extends T> Subtask<U> fork(Callable<? extends U> task) {
        try {
            // System.out.println("WAIT: semPermits = " + pool.availablePermits());
            pool.acquire();
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }

        var subTask = super.fork(task);
        // System.out.println("FORK: subtask = " + subTask);
        return (Subtask<U>) subTask;
    }
}
