import { protect, unprotect, applySnapshot, types, isProtected } from '../src'
import { test } from 'ava'

const Todo = types.model(
    'Todo',
    {
        title: ''
    },
    {
        setTitle(newTitle) {
            this.title = newTitle
        }
    }
)

const Store = types.model('Store', {
    todos: types.array(Todo)
})

function createTestStore() {
    return Store.create({
        todos: [{ title: 'Get coffee' }, { title: 'Get biscuit' }]
    })
}

test('it should be possible to protect an object', t => {
    const store = createTestStore()

    unprotect(store)

    store.todos[1].title = 'A'

    protect(store)

    t.throws(() => {
        store.todos[0].title = 'B'
    }, "[mobx-state-tree] Cannot modify 'Todo@/todos/0', the object is protected and can only be modified by using an action.")

    t.is(store.todos[1].title, 'A')
    t.is(store.todos[0].title, 'Get coffee')

    store.todos[0].setTitle('B')
    t.is(store.todos[0].title, 'B')
})

test('protect should protect against any update', t => {
    const store = createTestStore()

    t.notThrows(
        // apply Snapshot / patch are currently allowed, even outside protected mode
        () => {
            applySnapshot(store, { todos: [{ title: 'Get tea' }] })
        },
        "[mobx-state-tree] Cannot modify 'Todo@<root>', the object is protected and can only be modified by using an action."
    )

    t.throws(() => {
        store.todos.push({ title: 'test' } as any)
    }, "[mobx-state-tree] Cannot modify 'Todo[]@/todos', the object is protected and can only be modified by using an action.")

    t.throws(() => {
        store.todos[0].title = 'test'
    }, "[mobx-state-tree] Cannot modify 'Todo@/todos/0', the object is protected and can only be modified by using an action.")
})

test('protect should also protect children', t => {
    const store = createTestStore()

    t.throws(() => {
        store.todos[0].title = 'B'
    }, "[mobx-state-tree] Cannot modify 'Todo@/todos/0', the object is protected and can only be modified by using an action.")

    store.todos[0].setTitle('B')
    t.is(store.todos[0].title, 'B')
})

test('unprotected mode should be lost when attaching children', t => {
    const store = Store.create({ todos: [] })
    const t1 = Todo.create({ title: 'hello' })
    unprotect(t1)

    t.is(isProtected(t1), false)
    t.is(isProtected(store), true)
    t1.title = 'world' // ok

    unprotect(store)
    store.todos.push(t1)
    protect(store)

    t.is(isProtected(t1), true)
    t.is(isProtected(store), true)
    t.throws(() => {
        t1.title = 'B'
    }, "[mobx-state-tree] Cannot modify 'Todo@/todos/0', the object is protected and can only be modified by using an action.")

    store.todos[0].setTitle('C')
    t.is(store.todos[0].title, 'C')
})

test('protected mode should be inherited when attaching children', t => {
    const store = Store.create({ todos: [] })
    unprotect(store)

    const t1 = Todo.create({ title: 'hello' })

    t.is(isProtected(t1), true)
    t.is(isProtected(store), false)
    t.throws(() => {
        t1.title = 'B'
    }, "[mobx-state-tree] Cannot modify 'Todo@<root>', the object is protected and can only be modified by using an action.")

    store.todos.push(t1)
    t1.title = 'world' // ok, now unprotected

    t.is(isProtected(t1), false)
    t.is(isProtected(store), false)
    t.is(store.todos[0].title, 'world')
})
