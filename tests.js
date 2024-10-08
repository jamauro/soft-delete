import { Tinytest } from 'meteor/tinytest';
import { Mongo } from 'meteor/mongo';
import { Accounts } from 'meteor/accounts-base';
import { SoftDelete, addDeleted } from 'meteor/jam:soft-delete';

const collection = new Mongo.Collection('test');
const dogs = new Mongo.Collection('dogs');

const config = {
  exclude: ['dogs']
};
SoftDelete.configure(config);

const insertDoc = async doc => collection.insertAsync(doc);
const removeDoc = async (selector, options) => collection.removeAsync(selector, options);
const softRemoveDoc = async selector => collection.softRemoveAsync(selector);
const recoverDoc = async selector => collection.recoverAsync(selector);
const reset = async () => collection.removeAsync({}, { soft: false });

const insertDog = async doc => dogs.insertAsync(doc);
const removeDog = async (selector, options) => dogs.removeAsync(selector, options);
const resetDogs = async () => dogs.removeAsync({});

Meteor.methods({ insertDoc, removeDoc, softRemoveDoc, recoverDoc, reset, insertDog, removeDog, resetDogs });

Tinytest.add('addDeleted', function (test) {
  let selector = {};

  addDeleted(selector);
  test.equal(selector.deleted, false);

  selector.deleted = true;
  addDeleted(selector);
  test.equal(selector.deleted, true);

  selector._id = 'someId';
  delete selector.deleted;
  addDeleted(selector);
  test.equal(selector.deleted, false);
});

Tinytest.addAsync('softRemoveAsync', async function (test) {
  await Meteor.callAsync('reset');
  const doc = { _id: 'doc1', name: 'Test Doc' };

  await Meteor.callAsync('insertDoc', doc);
  await Meteor.callAsync('softRemoveDoc', { _id: doc._id });
  const removedDoc = await collection.findOneAsync({ _id: doc._id });

  test.equal(removedDoc, undefined);

  if (Meteor.isServer) {
    const deletedDoc = await collection.findOneAsync({ _id: doc._id, deleted: true });
    test.equal(deletedDoc.deleted, true);
    test.isTrue(deletedDoc.updatedAt instanceof Date);
  }
});

Tinytest.addAsync('recoverAsync', async function (test) {
  await Meteor.callAsync('reset');
  const doc = { _id: 'doc2', name: 'Test Doc' };

  await Meteor.callAsync('insertDoc', doc);
  await Meteor.callAsync('removeDoc', { _id: doc._id });

  await Meteor.callAsync('recoverDoc', { _id: doc._id });
  const recoveredDoc = await collection.findOneAsync({ _id: doc._id });

  if (Meteor.isServer) {
    test.equal(recoveredDoc.deleted, false);
    test.isTrue(recoveredDoc.updatedAt instanceof Date);
    test.isUndefined(recoveredDoc.deletedAt);
  }
});

Tinytest.addAsync('removeAsync with string selector', async function (test) {
  await Meteor.callAsync('reset');
  const doc = { _id: 'doc4', name: 'Test Doc' };

  await Meteor.callAsync('insertDoc', doc);
  await Meteor.callAsync('removeDoc', doc._id);

  const removedDoc = await collection.findOneAsync({ _id: doc._id });

  test.equal(removedDoc, undefined);

  if (Meteor.isServer) {
    const deletedDoc = await collection.findOneAsync({ _id: doc._id, deleted: true });
    test.equal(deletedDoc.deleted, true);
    test.isTrue(deletedDoc.updatedAt instanceof Date);
  }
});

Tinytest.addAsync('recoverAsync with string selector', async function (test) {
  await Meteor.callAsync('reset');
  const doc = { _id: 'doc5', name: 'Test Doc' };

  await Meteor.callAsync('insertDoc', doc);
  await Meteor.callAsync('removeDoc', doc._id);

  await Meteor.callAsync('recoverDoc', doc._id);

  const recoveredDoc = await collection.findOneAsync({ _id: doc._id });

  if (Meteor.isServer) {
    test.equal(recoveredDoc.deleted, false);
    test.isTrue(recoveredDoc.updatedAt instanceof Date);
    test.isUndefined(recoveredDoc.deletedAt);
  }
});

Tinytest.addAsync('removeAsync with soft: false', async function (test) {
  await Meteor.callAsync('reset');
  const doc = { _id: 'doc3', name: 'Test Doc' };

  await Meteor.callAsync('insertDoc', doc);
  await Meteor.callAsync('removeDoc', { _id: doc._id }, { soft: false });

  const removedDoc = await collection.findOneAsync({ _id: doc._id });

  test.isUndefined(removedDoc);
});

Tinytest.addAsync('findOneAsync with string selector', async function (test) {
  await Meteor.callAsync('reset');
  const doc = { _id: 'doc6', name: 'Test Doc' };

  await Meteor.callAsync('insertDoc', doc);
  await Meteor.callAsync('removeDoc', doc._id);

  const removedDoc = await collection.findOneAsync(doc._id);

  if (Meteor.isServer) {
    test.equal(removedDoc.deleted, true);
    test.isTrue(removedDoc.updatedAt instanceof Date);
  }
});

Tinytest.addAsync('deleted is automatically added on insert', async function (test) {
  await Meteor.callAsync('reset');
  const doc = { _id: 'doc7', name: 'Test Doc' };

  await Meteor.callAsync('insertDoc', doc);

  const foundDoc = await collection.findOneAsync(doc._id);

  if (Meteor.isServer) {
    test.equal(foundDoc.deleted, false);
  }
});

if (Meteor.isServer) {
  Tinytest.addAsync('deleted is automatically added when creating a user', async function (test) {
    await Meteor.users.removeAsync({}, { soft: false })
    await Accounts.onCreateUser((options, user) => {
      user.something = 'something';
      return user;
    });

    try {
      await Accounts.createUserAsync({ username: 'bob', password: '1234' });

      const bob = await Meteor.users.findOneAsync({ username: 'bob' })

      test.equal(bob.deleted, false);
      test.equal(bob.something, 'something');
    } catch (error) {
      test.equal('should not be reached', true)
    }
  });
}

Tinytest.addAsync('collection is excluded as expected', async function (test) {

  await Meteor.callAsync('resetDogs');

  const doc = { _id: '1', name: 'fido' };

  await Meteor.callAsync('insertDog', doc);

  if (Meteor.isServer) {
    const foundDoc = await dogs.findOneAsync(doc._id);
    test.equal(foundDoc.deleted, undefined);
  }

  await Meteor.callAsync('removeDog', { _id: doc._id });

  if (Meteor.isServer) {
    const allDocs = await dogs.find().fetchAsync();
    test.equal(allDocs.length, 0)
  }
});

Tinytest.add('configure', function (test) {
  const newConfig = {
    deleted: 'isDeleted',
    deletedAt: 'deletedAt',
    autoFilter: false,
    overrideRemove: false,
    exclude: ['dogs']
  };
  SoftDelete.configure(newConfig);
  const config = SoftDelete.config;
  test.equal(config.deleted, 'isDeleted');
  test.equal(config.deletedAt, 'deletedAt');
  test.equal(config.autoFilter, false);
  test.equal(config.overrideRemove, false);
  test.equal(config.exclude, ['dogs']);
});
