import { NodeModulesExternal } from "@finos/perspective-esbuild-plugin/external.js";
import { build } from "@finos/perspective-esbuild-plugin/build.js";
import { BuildCss } from "@prospective.co/procss/target/cjs/procss.js";
import { getarg } from "./tools/getarg.mjs";
import fs from "fs";
import cpy from "cpy";
import path_mod from "path";

const DEBUG = getarg("--debug");

const COMMON_DEFINE = {
  global: "window",
  "process.env.DEBUG": `${DEBUG}`,
};

const BUILD = [
  {
    define: COMMON_DEFINE,
    entryPoints: ["src/ts/index.ts"],
    plugins: [NodeModulesExternal()],
    format: "esm",
    loader: {
      ".css": "text",
      ".html": "text",
    },
    outfile: "dist/esm/index.js",
  },
  {
    define: COMMON_DEFINE,
    entryPoints: ["src/ts/index.ts"],
    plugins: [],
    format: "esm",
    loader: {
      ".css": "text",
      ".html": "text",
    },
    outfile: "dist/cdn/index.js",
  },
];

async function compile_css() {
  const process_path = (path) => {
    const outpath = path.replace("src/less", "dist/css");
    fs.mkdirSync(outpath, { recursive: true });

    fs.readdirSync(path).forEach((file_or_folder) => {
      if (file_or_folder.endsWith(".less")) {
        const outfile = file_or_folder.replace(".less", ".css");
        const builder = new BuildCss("");
        builder.add(
          `${path}/${file_or_folder}`,
          fs
            .readFileSync(path_mod.join(`${path}/${file_or_folder}`))
            .toString(),
        );
        fs.writeFileSync(
          `${path.replace("src/less", "dist/css")}/${outfile}`,
          builder.compile().get(outfile),
        );
      } else {
        process_path(`${path}/${file_or_folder}`);
      }
    });
  };
  // recursively process all less files in src/less
  process_path("src/less");
  cpy("src/css/*", "dist/css/");
}

async function copy_html() {
  fs.mkdirSync("dist/html", { recursive: true });
  cpy("src/html/*", "dist/html");
  // also copy to top level
  cpy("src/html/*", "dist/");
}

async function copy_img() {
  fs.mkdirSync("dist/img", { recursive: true });
  cpy("src/img/*", "dist/img");
}

async function copy_to_python() {
  fs.mkdirSync("../python_template_js/extension", { recursive: true });
  cpy("dist/**/*", "../python_template_js/extension");
}

async function build_all() {
  await compile_css();
  await copy_html();
  await copy_img();
  await Promise.all(BUILD.map(build)).catch(() => process.exit(1));
  await copy_to_python();
}

build_all();
