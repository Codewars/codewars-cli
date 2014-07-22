(ns codewars.runner
  (:require [codewars.runner :refer [run]]
            [clojure.java.io :as io]
            [codewars.util :refer [write-code!]])
  (:import [codewars.java TempDir]
           [java.net URLClassLoader]
           [javax.tools ToolProvider]
           [org.junit.runner JUnitCore]
           [codewars.java CwRunListener]
           [java.io IOException]))

(defn- compile! [& files]
  ;; TODO: Add classpath option, other goodies
  (let [compilation-result
        (-> (ToolProvider/getSystemJavaCompiler)
            (.run nil nil nil
                  (into-array (map str files))))]
    (if (zero? compilation-result)
      0
      (throw (IOException. "Java compilation error")))))

(defn- load-class [dir class-name]
  "Load a java class in a specified directory"
  ;; TODO: Make the classpath include all the classes on the system classpath
  (let [class-loader
        (URLClassLoader/newInstance
         (into-array [(-> dir .toURI .toURL)]))]
    (Class/forName (name class-name) true class-loader)))

(defn- run-junit-tests [fixture-class]
  (let [runner (JUnitCore.)]
    (.addListener runner (CwRunListener.))
    (.run runner (into-array [fixture-class]))))

(defn- file-names [files]
  (for [{:keys [:file-name]} files
        :when (not (nil? file-name))]
    file-name))

(defmethod solution-only "java"
  [{:keys [:setup :solution]}]
  (let [dir (TempDir/create "java")
        setup (when (not (empty? setup)) (write-code! "java" dir setup))
        solution (write-code! "java" dir solution)
        files (file-names [setup solution])]
    (apply compile! files)
    (-> solution
        :class-name
        (->> (load-class dir))
        (.getMethod "main" nil)
        (.invoke nil nil))))

(defmethod full-project "java"
  [{:keys [:fixture :setup :solution]}]
  (let [dir (TempDir/create "java")
        fixture (write-code! "java" dir fixture)
        setup (when (not (empty? setup)) (write-code! "java" dir setup))
        solution (write-code! "java" dir solution)
        files (file-names [fixture setup solution])]
    (apply compile! files)
    (->> fixture :class-name (load-class dir) run-junit-tests)))
