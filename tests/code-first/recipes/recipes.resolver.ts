import { NotFoundException, UseGuards } from '@nestjs/common';
import { PubSub } from 'apollo-server-express';
import {
  Args,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '../../../lib';
import { AuthGuard } from '../common/guards/auth.guard';
import { NewRecipeInput } from './dto/new-recipe.input';
import { RecipesArgs } from './dto/recipes.args';
import { Ingredient } from './models/ingredient';
import { IRecipe, Recipe } from './models/recipe';
import { RecipesService } from './recipes.service';
import { SearchResultUnion } from './unions/search-result.union';

const pubSub = new PubSub();

@Resolver(of => Recipe)
export class RecipesResolver {
  constructor(private readonly recipesService: RecipesService) {}

  @UseGuards(AuthGuard)
  @Query(returns => IRecipe, { description: 'get recipe by id' })
  async recipe(
    @Args({
      name: 'id',
      defaultValue: '1',
      description: 'recipe id',
      type: () => String,
    })
    id: string,
  ): Promise<IRecipe> {
    const recipe = await this.recipesService.findOneById(id);
    if (!recipe) {
      throw new NotFoundException(id);
    }
    return recipe;
  }

  @Query(returns => [SearchResultUnion], { deprecationReason: 'test' })
  async search(): Promise<Array<typeof SearchResultUnion>> {
    return [
      new Recipe({ title: 'recipe' }),
      new Ingredient({
        name: 'test',
      }),
    ];
  }

  @Query(returns => [Recipe])
  recipes(@Args() recipesArgs: RecipesArgs): Promise<Recipe[]> {
    return this.recipesService.findAll(recipesArgs);
  }

  @Mutation(returns => Recipe)
  async addRecipe(
    @Args('newRecipeData') newRecipeData: NewRecipeInput,
  ): Promise<Recipe> {
    const recipe = await this.recipesService.create(newRecipeData);
    pubSub.publish('recipeAdded', { recipeAdded: recipe });
    return recipe;
  }

  @ResolveField('ingredients', () => [Ingredient])
  getIngredients(@Parent() root) {
    return [new Ingredient({ name: 'cherry' })];
  }

  @ResolveField()
  rating(): number {
    return 10;
  }

  @Mutation(returns => Boolean)
  async removeRecipe(@Args('id') id: string) {
    return this.recipesService.remove(id);
  }

  @Subscription(returns => Recipe, { description: 'subscription description' })
  recipeAdded() {
    return pubSub.asyncIterator('recipeAdded');
  }
}