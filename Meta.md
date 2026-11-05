# Product Meta Description update:

```js
db.getCollection('products').aggregate([
  {
    $match: {
      $or: [
        { metaTitle: { $exists: false } },
        { metaTitle: null },
        { metaTitle: '' },
        { metaDescription: { $exists: false } },
        { metaDescription: null },
        { metaDescription: '' },
      ],
    },
  },
  {
    $project: {
      title: 1,
      metaTitle: {
        $concat: ['Best', ' ', '$title', ' Price in Bangladesh'],
      },
      metaDescription: {
        $concat: [
          'Find the best',
          ' ',
          '$title',
          ' price in Bangladesh (BD). Buy new, cheap, industrial ',
          '$title',
          ' online for sale near Dhaka at the best price.',
        ],
      },
    },
  },
]);
```
