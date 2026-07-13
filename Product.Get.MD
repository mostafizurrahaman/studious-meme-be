I will start by listing the contents of the workspace directory
`c:\Users\mosta\OneDrive\Desktop\SHON\backend_apis` to understand the codebase
structure and locate the product-related API code.

Listed directory backend_apis

I will search the `src` directory using the grep search tool to find references
to product routes or controllers, specifically looking for the endpoint that
retrieves products and parses filters.

Searched for "/products"

I will view the `product.routes.ts` file to see how the product endpoints are
defined and what controllers handle them.

Viewed product.routes.ts:1-68

I will list the files in the `src/app/modules/Product` directory to locate the
controller and service files where the query parameters and filters are
processed.

Listed directory Product

I will now view the `product.controller.ts` file to see how filters are received
from the request queries.

Viewed product.controller.ts:1-150

I will view the `product.service.ts` file to see how `getAllProductsFromDB` and
`getAllActiveProductsFromDB` parse the `req.query` parameters, which filters are
supported, and their possible values.

Viewed product.service.ts:1-722

I will read the `product.validation.ts` file to see if there are any specific
Zod validation schemas for query parameters or if the query validation is
handled differently.

Viewed product.validation.ts:1-150

For the **Get Products** APIs (`/products` and `/products/active`), query
parameters and filters are parsed and handled in the product service function
[`buildProductFilters`](file:///c:/Users/mosta/OneDrive/Desktop/SHON/backend_apis/src/app/modules/Product/product.service.ts#L144-L321)
called by
[`getAllProductsFromDB`](file:///c:/Users/mosta/OneDrive/Desktop/SHON/backend_apis/src/app/modules/Product/product.service.ts#L384-L417).

There are **13 query parameters** (including pagination, sorting, projections,
and aliases) used to filter and format the products.

---

### 1. Pagination, Sorting & Projection (4 parameters)

| Parameter    | Type / Format        | Default Value | Description / Possible Values                                                                                              |
| :----------- | :------------------- | :------------ | :------------------------------------------------------------------------------------------------------------------------- |
| **`page`**   | Positive Integer     | `1`           | Page number for paginating results.                                                                                        |
| **`limit`**  | Positive Integer     | `100`         | Number of items to retrieve per page.                                                                                      |
| **`sort`**   | String               | `'latest'`    | Supported values: `price-asc`, `price-desc`, `oldest`, `latest`                                                            |
| **`fields`** | Comma-separated list | _None_        | Specific fields to select/project (e.g., `title,price,slug`). If omitted, populates nested `brand` and `category` details. |

---

### 2. Search & Filters (9 parameters)

| Parameter             | Alias             | Type / Format        | Supported Values / Description                                                                                                                                                                                                                                                                                                                                                                               |
| :-------------------- | :---------------- | :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`searchTerm`**      | _None_            | String               | Searches by pattern match (regex) across: `title`, `sku`, `slug`, `badge`, `features`, and `description`.                                                                                                                                                                                                                                                                                                    |
| **`category`**        | **`c`**           | String               | Category slug or category name (e.g., `power-tools`). Filters by the category ID.                                                                                                                                                                                                                                                                                                                            |
| **`subCategorySlug`** | **`subCategory`** | String               | Subcategory slug (e.g., `cordless-drills`). Matches `subCategorySlug` property directly on products.                                                                                                                                                                                                                                                                                                         |
| **`stock`**           | **`s`**           | String               | Preset status filters: <br>• `'in-stock'`: Products with stock `> 0`, `null`, or undefined.<br>• `'featured'`: Marked as featured (`isFeatured: true` or badge contains `'featured'`).<br>• `'sale'`: Discounted products (`oldPrice` exists or badge contains `'sale'` or `'%').`                                                                                                                           |
| **`tag`**             | _None_            | String               | Filter logic by tags:<br>• `'featured'`: Matches featured items.<br>• `'sale'`: Matches sale/discounted items.<br>• `'latest'`: Matches products with no badge, or badge not containing `'old'`.<br>• `'industrial'`: Matches products belonging to categories like tools, machine, industrial, welding, etc.<br>• `'home'`: Matches products belonging to categories like home, fan, cleaning, cooler, etc. |
| **`price`**           | **`p`**           | String               | Filter by price ranges: <br>• **Preset Ranges**: `'under-10000'`, `'10000-50000'`, and `'50000-plus'`. <br>• **Custom Ranges**: Format `min-max` (e.g., `'100-500'`, `'-500'` for max only, `'200-'` for min only).                                                                                                                                                                                          |
| **`brand`**           | **`b`**           | Comma-separated list | Filter by one or more brand slugs or names (e.g., `'bosch,makita'`).                                                                                                                                                                                                                                                                                                                                         |
| **`excludeSlug`**     | _None_            | String               | Excludes a product with the specified slug from the results (useful for related product suggestions).                                                                                                                                                                                                                                                                                                        |
| **`includeInactive`** | _None_            | String (`'true'`)    | If `'true'`, includes inactive products, categories, and brands. _(Overridden and forced to false on the `/products/active` endpoint)._                                                                                                                                                                                                                                                                      |
