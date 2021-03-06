/*\
title: js/macros/tiddler.js

The tiddler macros transcludes another macro into the tiddler being rendered.

Parameters:
	target: the title of the tiddler to transclude
	template: the title of the tiddler to use as a template for the transcluded tiddler
	with: optional parameters to be substituted into the rendered tiddler

The simplest case is to just supply a target tiddler:

<<tiddler Foo>> or <<transclude target:Foo>>

This will render the tiddler Foo within the current tiddler. If the tiddler Foo includes
the view macro (or other macros that reference the fields of the current tiddler), then the
fields of the tiddler Foo will be accessed.

If you want to transclude the tiddler as a template, so that the fields referenced by the view
macro are those of the tiddler doing the transcluding, then you can instead specify the tiddler
as a template:

<<tiddler template:Foo>>

The effect is the same as the previous example: the text of the tiddler Foo is rendered. The
difference is that the view macro will access the fields of the tiddler doing the transcluding.

The `target` and `template` parameters may be combined:

<<tiddler target:Foo template:Bar>>

Here, the text of the tiddler `Bar` will be transcluded, with the macros within it accessing the fields
of the tiddler `Foo`.

Finally, the `with` parameter is used to substitute values for the special markers $1, $2, $3 etc. The
substitutions are performed on the tiddler whose text is being rendered: either the tiddler named in
the `template` parameter or, if that parameter is missing, the tiddler named in the `target` parameter.

\*/
(function(){

/*jslint node: true */
"use strict";

var Renderer = require("../Renderer.js").Renderer,
	Dependencies = require("../Dependencies.js").Dependencies,
	utils = require("../Utils.js");

exports.macro = {
	name: "tiddler",
	cascadeParams: true, // Cascade names of named parameters to following anonymous parameters
	params: {
		target: {byName: "default", type: "tiddler"},
		template: {byName: true, type: "tiddler"},
		"with": {byName: true, type: "text", dependentAll: true}
	},
	evaluateDependencies: function() {
		var dependencies = new Dependencies(),
			template = this.srcParams.template;
		if(template === undefined) {
			template = this.srcParams.target;
		}
		if(typeof template === "function") {
			dependencies.dependentAll = true;
		} else {
			dependencies.addDependency(template,true);
		}
		return dependencies;
	},
	execute: function() {
		var renderTitle = this.params.target,
			renderTemplate = this.params.template,
			content,
			contentClone = [],
			t,
			parents = this.parents.slice(0);
		// If there's no render title specified then use the current tiddler title
		if(typeof renderTitle !== "string") {
			renderTitle = this.tiddlerTitle;
		}
		// If there's no template specified then use the target tiddler title
		if(typeof renderTemplate !== "string") {
			renderTemplate = renderTitle;
		}
		// Check for recursion
		if(parents.indexOf(renderTemplate) !== -1) {
			content = [Renderer.ErrorNode("Tiddler recursion error in <<tiddler>> macro")];	
		} else {
			if("with" in this.params) {
				// Parameterised transclusion
				var targetTiddler = this.store.getTiddler(renderTemplate),
					text = targetTiddler.text;
				var withTokens = [this.params["with"]];
				for(t=0; t<withTokens.length; t++) {
					var placeholderRegExp = new RegExp("\\$"+(t+1),"mg");
					text = text.replace(placeholderRegExp,withTokens[t]);
				}
				content = this.store.parseText(targetTiddler.type,text).nodes;
			} else {
				// There's no parameterisation, so we can just render the target tiddler directly
				var parseTree = this.store.parseTiddler(renderTemplate);
				content = parseTree ? parseTree.nodes : [];
			}
		}
		// Update the stack of tiddler titles for recursion detection
		parents.push(renderTemplate);
		// Clone the content
		for(t=0; t<content.length; t++) {
			contentClone.push(content[t].clone());
		}
		// Execute macros within the content
		for(t=0; t<contentClone.length; t++) {
			contentClone[t].execute(parents,renderTitle);
		}
		// Set up the attributes for the wrapper element
		var attributes = {
			"data-tiddler-target": renderTitle,
			"data-tiddler-template": renderTemplate,
			"class": ["tw-tiddler-frame"]
		};
		if(!this.store.tiddlerExists(renderTitle)) {
			attributes["class"].push("tw-tiddler-missing");
		}
		// Return the content
		return [Renderer.ElementNode("div",attributes,contentClone)];
	},
	refreshInDom: function(changes) {
		var t;
		// Set the class for missing tiddlers
		var renderTitle = this.params.target;
		if(typeof renderTitle !== "string") {
			renderTitle = this.params.template;
		}
		if(renderTitle) {
			utils.toggleClass(this.content[0].domNode,"tw-tiddler-missing",!this.store.tiddlerExists(renderTitle));
		}
		// Rerender the tiddler if it is impacted by the changes
		if(this.dependencies.hasChanged(changes,this.tiddlerTitle)) {
			// Manually reexecute and rerender this macro
			while(this.domNode.hasChildNodes()) {
				this.domNode.removeChild(this.domNode.firstChild);
			}
			this.execute(this.parents,this.tiddlerTitle);
			for(t=0; t<this.content.length; t++) {
				this.content[t].renderInDom(this.domNode);
			}
		} else {
			// Refresh any children
			for(t=0; t<this.content.length; t++) {
				this.content[t].refreshInDom(changes);
			}
		}
	}
};

})();
