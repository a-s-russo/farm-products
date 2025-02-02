import express from "express";
import methodOverride from "method-override";
import mongoose from "mongoose";
import path from "node:path";
import { AppError } from "./AppError.js";
import { Farm } from "./models/farm.js";
import { fileURLToPath } from "node:url";
import { Product } from "./models/product.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 3000;

mongoose
  .connect("mongodb://localhost:27017/farmStand")
  .then(() => {
    console.log("Mongo connection open");
  })
  .catch((err) => {
    console.log("Mongo connection error");
    console.log(err);
  });

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// FARM ROUTES

app.get(
  "/farms",
  wrapAsync(async (req, res, next) => {
    const farms = await Farm.find({});
    res.render("farms/index", { farms });
  })
);

app.get("/farms/new", (req, res) => {
  res.render("farms/new");
});

app.delete(
  "/farms/:id",
  wrapAsync(async (req, res, next) => {
    const farm = await Farm.findByIdAndDelete(req.params.id);
    res.redirect("/farms");
  })
);

app.get(
  "/farms/:id",
  wrapAsync(async (req, res, next) => {
    const farm = await Farm.findById(req.params.id).populate("products");
    if (!farm) {
      throw new AppError("Farm not found", 404);
    } else {
      res.render("farms/show", { farm });
    }
  })
);

app.post(
  "/farms",
  wrapAsync(async (req, res, next) => {
    const farm = new Farm(req.body);
    await farm.save();
    res.redirect("/farms");
  })
);

app.get(
  "/farms/:id/products/new",
  wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const farm = await Farm.findById(id);
    if (!farm) {
      throw new AppError("Farm not found", 404);
    } else {
      res.render("products/new", { categories, farm });
    }
  })
);

app.post(
  "/farms/:id/products",
  wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const farm = await Farm.findById(id);
    if (!farm) {
      throw new AppError("Farm not found", 404);
    } else {
      const { name, price, category } = req.body;
      const product = new Product({ name, price, category });
      farm.products.push(product);
      product.farm = farm;
      await farm.save();
      await product.save();
      res.redirect(`/farms/${farm._id}`);
    }
  })
);

// PRODUCT ROUTES

const categories = ["fruit", "vegetable", "dairy"];

function wrapAsync(fn) {
  return function (req, res, next) {
    fn(req, res, next).catch((e) => next(e));
  };
}

app.get(
  "/products",
  wrapAsync(async (req, res, next) => {
    const { category } = req.query;
    if (category) {
      const products = await Product.find({ category });
      res.render("products/index", { products, category });
    } else {
      const products = await Product.find({});
      res.render("products/index", { products, category: "All" });
    }
  })
);

app.get("/products/new", (req, res) => {
  res.render("products/new", { categories });
});

app.post(
  "/products",
  wrapAsync(async (req, res, next) => {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.redirect(`/products/${newProduct._id}`);
  })
);

app.get(
  "/products/:id",
  wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const product = await Product.findById(id).populate("farm", "name");
    if (!product) {
      throw new AppError("Product not found", 404);
    } else {
      res.render("products/show", { product });
    }
  })
);

app.get(
  "/products/:id/edit",
  wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      throw new AppError("Product not found", 404);
    } else {
      res.render("products/edit", { product, categories });
    }
  })
);

app.put(
  "/products/:id",
  wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    const product = await Product.findByIdAndUpdate(id, req.body, {
      runValidators: true,
      new: true,
    });
    res.redirect(`/products/${product._id}`);
  })
);

app.delete(
  "/products/:id",
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    const deletedProduct = await Product.findByIdAndDelete(id);
    res.redirect("/products");
  })
);

const handleValidationErr = (err) => {
  console.dir(err);
  return new AppError(`Validation failed: ${err.message}`, 400);
};

app.use((err, req, res, next) => {
  console.log(err.name);
  if (err.name === "ValidationError") err = handleValidationErr(err);
  next(err);
});

app.use((err, req, res, next) => {
  const { status = 500, message = "Something went wrong" } = err;
  res.status(status).send(message);
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
